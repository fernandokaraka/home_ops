import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Bill, Transaction, FinanceCategory, MonthlySummary } from "@/types";
import {
  scheduleBillReminder,
  cancelNotificationsByTag,
  scheduleAllBillReminders,
} from "@/services/notificationService";

interface FinanceState {
  bills: Bill[];
  transactions: Transaction[];
  categories: FinanceCategory[];
  monthlySummary: MonthlySummary | null;
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
  createTransaction: (transaction: Partial<Transaction>) => Promise<{ error: string | null }>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<{ error: string | null }>;
  deleteTransaction: (id: string) => Promise<{ error: string | null }>;
  clearError: () => void;
}

export const useFinanceStore = create<FinanceState & FinanceActions>((set, get) => ({
  bills: [],
  transactions: [],
  categories: [],
  monthlySummary: null,
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
    const endDate = `${currentMonth}-31`;

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
    const endDate = `${currentMonth}-31`;

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

    return { error: null };
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
