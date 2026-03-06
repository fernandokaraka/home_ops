import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Bill, Transaction, FinanceCategory, MonthlySummary, Attachment, Budget, FinancialGoal } from "@/types";
import {
  scheduleBillReminder,
  cancelNotificationsByTag,
  scheduleAllBillReminders,
} from "@/services/notificationService";
import {
  uploadFile,
  deleteFile,
  generateStoragePath,
} from "@/services/storageService";

export interface BudgetAlert {
  budget: Budget;
  spent: number;
  limit: number;
  percentageUsed: number;
  remaining: number;
  status: 'ok' | 'warning' | 'danger';
}

export interface GoalProjection {
  goal: FinancialGoal;
  progressPercentage: number;
  remainingAmount: number;
  daysUntilTarget: number;
  isOnTrack: boolean;
  projectedCompletionDate: string | null;
  requiredMonthlySavings: number;
}

interface FinanceState {
  bills: Bill[];
  transactions: Transaction[];
  categories: FinanceCategory[];
  monthlySummary: MonthlySummary | null;
  attachments: Attachment[];
  budgets: Budget[];
  financialGoals: FinancialGoal[];
  isLoading: boolean;
  error: string | null;
}

interface FinanceActions {
  fetchBills: (householdId: string) => Promise<void>;
  fetchTransactions: (householdId: string, month?: string) => Promise<void>;
  fetchCategories: () => Promise<void>;
  calculateMonthlySummary: (householdId: string, month?: string) => Promise<void>;
  createBill: (bill: Partial<Bill>) => Promise<{ error: string | null }>;
  updateBill: (id: string, updates: Partial<Bill>) => Promise<{ error: string | null }>;
  deleteBill: (id: string) => Promise<{ error: string | null }>;
  markBillAsPaid: (id: string, amount?: number) => Promise<{ error: string | null }>;
  createTransaction: (transaction: Partial<Transaction>) => Promise<{ error: string | null; data?: Transaction }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ error: string | null }>;
  fetchAttachments: (transactionId: string) => Promise<void>;
  addAttachment: (
    transactionId: string,
    householdId: string,
    file: { uri: string; name: string; type: string; size?: number },
    userId?: string
  ) => Promise<{ error: string | null }>;
  deleteAttachment: (attachmentId: string) => Promise<{ error: string | null }>;
  fetchBudgets: (householdId: string, month?: string) => Promise<void>;
  createBudget: (budget: Partial<Budget>) => Promise<{ error: string | null }>;
  updateBudget: (id: string, updates: Partial<Budget>) => Promise<{ error: string | null }>;
  deleteBudget: (id: string) => Promise<{ error: string | null }>;
  fetchFinancialGoals: (householdId: string) => Promise<void>;
  createFinancialGoal: (goal: Partial<FinancialGoal>) => Promise<{ error: string | null }>;
  updateFinancialGoal: (id: string, updates: Partial<FinancialGoal>) => Promise<{ error: string | null }>;
  deleteFinancialGoal: (id: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useFinanceStore = create<FinanceState & FinanceActions>((set, get) => ({
  bills: [],
  transactions: [],
  categories: [],
  monthlySummary: null,
  attachments: [],
  budgets: [],
  financialGoals: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    const { data, error } = await supabase
      .from("finance_categories")
      .select("*")
      .order("type")
      .order("name");

    if (error) {
      console.error("Error fetching finance categories:", error);
      return;
    }

    set({ categories: data || [] });
  },

  fetchBills: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("bills")
      .select(`
        *,
        category:finance_categories(*)
      `)
      .eq("household_id", householdId)
      .order("due_day", { ascending: true });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    // Atualiza status baseado no dia atual
    const today = new Date().getDate();
    const updatedBills = (data || []).map((bill) => {
      if (bill.current_month_status === "pending" && bill.due_day && bill.due_day < today) {
        return { ...bill, current_month_status: "overdue" };
      }
      return bill;
    });

    set({ bills: updatedBills, isLoading: false });

    // Schedule notifications for pending bills
    const pendingBills = updatedBills.filter((b) => b.current_month_status !== "paid");
    scheduleAllBillReminders(pendingBills);
  },

  fetchTransactions: async (householdId: string, month?: string) => {
    set({ isLoading: true, error: null });

    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${currentMonth}-01`;
    const [year, mon] = currentMonth.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const endDate = `${currentMonth}-${String(lastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("transactions")
      .select(`
        *,
        category:finance_categories(*)
      `)
      .eq("household_id", householdId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ transactions: data || [], isLoading: false });
  },

  calculateMonthlySummary: async (householdId: string, month?: string) => {
    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const startDate = `${currentMonth}-01`;
    const [summaryYear, summaryMon] = currentMonth.split("-").map(Number);
    const summaryLastDay = new Date(summaryYear, summaryMon, 0).getDate();
    const endDate = `${currentMonth}-${String(summaryLastDay).padStart(2, "0")}`;

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, type")
      .eq("household_id", householdId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (error) {
      console.error("Error calculating summary:", error);
      return;
    }

    const summary = (data || []).reduce(
      (acc, t) => {
        if (t.type === "income") {
          acc.total_income += Number(t.amount);
        } else {
          acc.total_expenses += Number(t.amount);
        }
        return acc;
      },
      { total_income: 0, total_expenses: 0 }
    );

    set({
      monthlySummary: {
        household_id: householdId,
        month: currentMonth,
        total_income: summary.total_income,
        total_expenses: summary.total_expenses,
        balance: summary.total_income - summary.total_expenses,
      },
    });
  },

  createBill: async (bill: Partial<Bill>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("bills")
      .insert(bill)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      bills: [...state.bills, data].sort((a, b) => (a.due_day || 0) - (b.due_day || 0)),
      isLoading: false,
    }));

    // Schedule notification for new bill
    if (data.current_month_status !== "paid") {
      scheduleBillReminder(data);
    }

    return { error: null };
  },

  updateBill: async (id: string, updates: Partial<Bill>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("bills")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      bills: state.bills.map((b) => (b.id === id ? data : b)),
      isLoading: false,
    }));

    // Update notification for bill
    if (data.current_month_status === "paid") {
      // Cancel notification if bill is paid
      cancelNotificationsByTag(`bill_${id}`);
    } else {
      scheduleBillReminder(data);
    }

    return { error: null };
  },

  deleteBill: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase.from("bills").delete().eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      bills: state.bills.filter((b) => b.id !== id),
      isLoading: false,
    }));

    // Cancel notification for deleted bill
    cancelNotificationsByTag(`bill_${id}`);

    return { error: null };
  },

  markBillAsPaid: async (id: string, amount?: number) => {
    const bill = get().bills.find((b) => b.id === id);
    if (!bill) return { error: "Bill not found" };

    const updates: Partial<Bill> = {
      current_month_status: "paid",
      current_month_paid_at: new Date().toISOString(),
      current_month_paid_amount: amount || bill.amount,
    };

    return get().updateBill(id, updates);
  },

  createTransaction: async (transaction: Partial<Transaction>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("transactions")
      .insert(transaction)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      transactions: [data, ...state.transactions],
      isLoading: false,
    }));

    // Recalcular resumo
    if (transaction.household_id) {
      get().calculateMonthlySummary(transaction.household_id);
    }

    return { error: null, data };
  },

  updateTransaction: async (id: string, updates: Partial<Transaction>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("transactions")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? data : t)),
      isLoading: false,
    }));

    // Recalcular resumo
    if (data.household_id) {
      get().calculateMonthlySummary(data.household_id);
    }

    return { error: null };
  },

  deleteTransaction: async (id: string) => {
    const transaction = get().transactions.find((t) => t.id === id);

    set({ isLoading: true, error: null });

    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
      isLoading: false,
    }));

    // Recalcular resumo
    if (transaction?.household_id) {
      get().calculateMonthlySummary(transaction.household_id);
    }

    return { error: null };
  },

  fetchAttachments: async (transactionId: string) => {
    const { data, error } = await supabase
      .from("attachments")
      .select("*")
      .eq("item_id", transactionId)
      .eq("item_type", "transaction")
      .order("created_at", { ascending: false });

    if (error) {
      return;
    }

    set({ attachments: data || [] });
  },

  addAttachment: async (
    transactionId: string,
    householdId: string,
    file: { uri: string; name: string; type: string; size?: number },
    userId?: string
  ) => {
    set({ isLoading: true, error: null });

    // Generate unique storage path
    const storagePath = generateStoragePath(householdId, file.name);

    // Upload file to Supabase Storage
    const fileUrl = await uploadFile(file.uri, "attachments", storagePath);

    if (!fileUrl) {
      set({ isLoading: false, error: "Erro ao fazer upload do arquivo" });
      return { error: "Erro ao fazer upload do arquivo" };
    }

    // Create attachment record in database
    const { data, error } = await supabase
      .from("attachments")
      .insert({
        household_id: householdId,
        item_id: transactionId,
        item_type: "transaction",
        file_name: file.name,
        file_url: fileUrl,
        file_type: file.type,
        file_size: file.size || null,
        created_by: userId || null,
      })
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await deleteFile("attachments", storagePath);
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      attachments: [data, ...state.attachments],
      isLoading: false,
    }));

    return { error: null };
  },

  deleteAttachment: async (attachmentId: string) => {
    set({ isLoading: true, error: null });

    // Get attachment details to extract storage path
    const attachment = get().attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      set({ isLoading: false, error: "Anexo não encontrado" });
      return { error: "Anexo não encontrado" };
    }

    // Extract storage path from file URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/attachments/[path]
    const urlParts = attachment.file_url.split("/attachments/");
    const storagePath = urlParts.length > 1 ? urlParts[1] : null;

    // Delete from database first
    const { error: dbError } = await supabase
      .from("attachments")
      .delete()
      .eq("id", attachmentId);

    if (dbError) {
      set({ isLoading: false, error: dbError.message });
      return { error: dbError.message };
    }

    // Delete file from storage
    if (storagePath) {
      await deleteFile("attachments", storagePath);
    }

    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attachmentId),
      isLoading: false,
    }));

    return { error: null };
  },

  // Budget actions
  fetchBudgets: async (householdId: string, month?: string) => {
    set({ isLoading: true, error: null });

    const currentMonth = month || new Date().toISOString().slice(0, 7);
    const monthDate = currentMonth.length === 7 ? `${currentMonth}-01` : currentMonth;

    const { data, error } = await supabase
      .from("budgets")
      .select(`
        *,
        category:finance_categories(*)
      `)
      .eq("household_id", householdId)
      .eq("month", monthDate)
      .order("created_at", { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ budgets: data || [], isLoading: false });
  },

  createBudget: async (budget: Partial<Budget>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("budgets")
      .insert(budget)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      budgets: [...state.budgets, data],
      isLoading: false,
    }));

    return { error: null };
  },

  updateBudget: async (id: string, updates: Partial<Budget>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("budgets")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        category:finance_categories(*)
      `)
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      budgets: state.budgets.map((b) => (b.id === id ? data : b)),
      isLoading: false,
    }));

    return { error: null };
  },

  deleteBudget: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase.from("budgets").delete().eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      budgets: state.budgets.filter((b) => b.id !== id),
      isLoading: false,
    }));

    return { error: null };
  },

  // Financial Goal actions
  fetchFinancialGoals: async (householdId: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("financial_goals")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (error) {
      set({ isLoading: false, error: error.message });
      return;
    }

    set({ financialGoals: data || [], isLoading: false });
  },

  createFinancialGoal: async (goal: Partial<FinancialGoal>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("financial_goals")
      .insert(goal)
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      financialGoals: [data, ...state.financialGoals],
      isLoading: false,
    }));

    return { error: null };
  },

  updateFinancialGoal: async (id: string, updates: Partial<FinancialGoal>) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from("financial_goals")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      financialGoals: state.financialGoals.map((g) => (g.id === id ? data : g)),
      isLoading: false,
    }));

    return { error: null };
  },

  deleteFinancialGoal: async (id: string) => {
    set({ isLoading: true, error: null });

    const { error } = await supabase.from("financial_goals").delete().eq("id", id);

    if (error) {
      set({ isLoading: false, error: error.message });
      return { error: error.message };
    }

    set((state) => ({
      financialGoals: state.financialGoals.filter((g) => g.id !== id),
      isLoading: false,
    }));

    return { error: null };
  },

  clearError: () => set({ error: null }),
}));

// Helpers
export const getPendingBills = (bills: Bill[]) => {
  return bills.filter((b) => b.current_month_status === "pending");
};

export const getPaidBills = (bills: Bill[]) => {
  return bills.filter((b) => b.current_month_status === "paid");
};

export const getOverdueBills = (bills: Bill[]) => {
  return bills.filter((b) => b.current_month_status === "overdue");
};

export const getTotalBillsAmount = (bills: Bill[]) => {
  return bills.reduce((sum, b) => sum + Number(b.amount), 0);
};

export const getPendingBillsAmount = (bills: Bill[]) => {
  return getPendingBills(bills).reduce((sum, b) => sum + Number(b.amount), 0);
};

export const getExpensesByCategory = (transactions: Transaction[]) => {
  const expenses = transactions.filter((t) => t.type === "expense");
  const grouped = expenses.reduce((acc, t) => {
    const categoryName = t.category?.name || "Outros";
    const categoryColor = t.category?.color || "#6B7280";
    if (!acc[categoryName]) {
      acc[categoryName] = { total: 0, color: categoryColor };
    }
    acc[categoryName].total += Number(t.amount);
    return acc;
  }, {} as Record<string, { total: number; color: string }>);

  return Object.entries(grouped)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total);
};

export const formatCurrency = (value: number) => {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

// Budget helpers
export const getBudgetAlerts = (budgets: Budget[], transactions: Transaction[]): BudgetAlert[] => {
  return budgets.map((budget) => {
    const categoryExpenses = transactions
      .filter((t) => t.type === "expense" && t.category_id === budget.category_id)
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const limit = Number(budget.amount);
    const spent = categoryExpenses;
    const remaining = limit - spent;
    const percentageUsed = limit > 0 ? (spent / limit) * 100 : 0;

    let status: 'ok' | 'warning' | 'danger' = 'ok';
    if (percentageUsed >= 100) {
      status = 'danger';
    } else if (percentageUsed >= 80) {
      status = 'warning';
    }

    return { budget, spent, limit, percentageUsed, remaining, status };
  });
};

export const getCriticalBudgetAlerts = (budgets: Budget[], transactions: Transaction[]): BudgetAlert[] => {
  return getBudgetAlerts(budgets, transactions).filter(
    (alert) => alert.status === 'warning' || alert.status === 'danger'
  );
};

// Financial Goal helpers
export const getGoalProjections = (goals: FinancialGoal[]): GoalProjection[] => {
  return goals
    .filter((g) => g.status === "in_progress")
    .map((goal) => {
      const currentAmount = Number(goal.current_amount);
      const targetAmount = Number(goal.target_amount);
      const remainingAmount = targetAmount - currentAmount;
      const progressPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

      const now = new Date();
      const targetDate = new Date(goal.target_date);
      const daysUntilTarget = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const createdAt = new Date(goal.created_at);
      const totalDays = Math.ceil((targetDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      const expectedProgress = totalDays > 0 ? (elapsedDays / totalDays) * 100 : 0;
      const isOnTrack = progressPercentage >= expectedProgress || daysUntilTarget > 0;

      // Project completion date based on current savings rate
      let projectedCompletionDate: string | null = null;
      if (elapsedDays > 0 && currentAmount > 0 && remainingAmount > 0) {
        const dailySavingsRate = currentAmount / elapsedDays;
        const daysToComplete = remainingAmount / dailySavingsRate;
        const projected = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        projectedCompletionDate = projected.toISOString().slice(0, 10);
      }

      // Required monthly savings
      const monthsRemaining = daysUntilTarget > 0 ? daysUntilTarget / 30 : 0;
      const requiredMonthlySavings = monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0;

      return {
        goal,
        progressPercentage,
        remainingAmount,
        daysUntilTarget,
        isOnTrack,
        projectedCompletionDate,
        requiredMonthlySavings,
      };
    });
};

export const getGoalsBehindSchedule = (goals: FinancialGoal[]): FinancialGoal[] => {
  const projections = getGoalProjections(goals);
  return projections.filter((p) => !p.isOnTrack).map((p) => p.goal);
};

export const getOverdueGoals = (goals: FinancialGoal[]): FinancialGoal[] => {
  const now = new Date();
  return goals.filter((g) => {
    if (g.status !== "in_progress") return false;
    const targetDate = new Date(g.target_date);
    return targetDate < now;
  });
};
