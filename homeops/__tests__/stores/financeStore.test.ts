import {
  useFinanceStore,
  getPendingBills,
  getPaidBills,
  getOverdueBills,
  getTotalBillsAmount,
  getPendingBillsAmount,
  getExpensesByCategory,
  formatCurrency,
} from "@/stores/financeStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import * as notificationService from "@/services/notificationService";
import type { Bill, Transaction, FinanceCategory } from "@/types";

// Mock notification service
jest.mock("@/services/notificationService", () => ({
  scheduleBillReminder: jest.fn(),
  cancelNotificationsByTag: jest.fn(),
  scheduleAllBillReminders: jest.fn(),
}));

describe("financeStore", () => {
  const mockCategory: FinanceCategory = {
    id: "cat-1",
    name: "Moradia",
    icon: "🏠",
    color: "#3B82F6",
    type: "expense",
    is_default: true,
  };

  const mockBill: Bill = {
    id: "bill-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockCategory,
    name: "Aluguel",
    amount: 1500,
    is_recurring: true,
    due_day: 10,
    current_month_status: "pending",
    current_month_paid_at: null,
    current_month_paid_amount: null,
    alert_days_before: 3,
    payment_method: "Transferência",
    auto_debit: false,
    notes: null,
    created_by: "user-1",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
  };

  const mockTransaction: Transaction = {
    id: "txn-1",
    household_id: "household-1",
    category_id: "cat-1",
    category: mockCategory,
    description: "Pagamento aluguel",
    amount: 1500,
    type: "expense",
    date: "2024-01-15",
    bill_id: null,
    notes: null,
    receipt_url: null,
    created_by: "user-1",
    created_at: "2024-01-15T10:00:00Z",
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useFinanceStore.setState({
      bills: [],
      transactions: [],
      categories: [],
      monthlySummary: null,
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useFinanceStore.getState();
      expect(state.bills).toEqual([]);
      expect(state.transactions).toEqual([]);
      expect(state.categories).toEqual([]);
      expect(state.monthlySummary).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchCategories", () => {
    it("should fetch categories successfully", async () => {
      const mockCategories: FinanceCategory[] = [
        mockCategory,
        {
          id: "cat-2",
          name: "Alimentação",
          icon: "🍽️",
          color: "#10B981",
          type: "expense",
          is_default: true,
        },
      ];

      mockData.finance_categories = mockCategories;

      await useFinanceStore.getState().fetchCategories();

      const state = useFinanceStore.getState();
      expect(state.categories).toHaveLength(2);
      expect(state.categories).toContainEqual(mockCategory);
    });

    it("should handle fetch categories error", async () => {
      mockData.finance_categories = null;

      await useFinanceStore.getState().fetchCategories();

      const state = useFinanceStore.getState();
      expect(state.categories).toEqual([]);
    });
  });

  describe("fetchBills", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should fetch bills successfully", async () => {
      const billWithFutureDueDate = {
        ...mockBill,
        due_day: 20,
      };
      const mockBills: Bill[] = [billWithFutureDueDate];
      mockData.bills = mockBills;

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.bills).toEqual(mockBills);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      const billWithFutureDueDate = {
        ...mockBill,
        due_day: 20,
      };
      mockData.bills = [billWithFutureDueDate];

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.bills).toEqual([billWithFutureDueDate]);
    });

    it("should mark pending bills as overdue if due_day is past", async () => {
      const overdueBill = {
        ...mockBill,
        due_day: 5,
        current_month_status: "pending" as const,
      };
      mockData.bills = [overdueBill];

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.bills[0].current_month_status).toBe("overdue");
    });

    it("should not mark pending bills as overdue if due_day is in future", async () => {
      const futureBill = {
        ...mockBill,
        due_day: 20,
        current_month_status: "pending" as const,
      };
      mockData.bills = [futureBill];

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.bills[0].current_month_status).toBe("pending");
    });

    it("should schedule notifications for pending bills", async () => {
      const pendingBill = { ...mockBill, due_day: 20 };
      const mockBills: Bill[] = [
        pendingBill,
        { ...mockBill, id: "bill-2", current_month_status: "paid", due_day: 20 },
      ];
      mockData.bills = mockBills;

      await useFinanceStore.getState().fetchBills("household-1");

      expect(notificationService.scheduleAllBillReminders).toHaveBeenCalledWith([pendingBill]);
    });

    it("should handle empty bill list", async () => {
      mockData.bills = [];

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.bills).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockData.bills = null;

      await useFinanceStore.getState().fetchBills("household-1");

      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("fetchTransactions", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should fetch transactions for current month", async () => {
      const mockTransactions: Transaction[] = [mockTransaction];
      mockData.transactions = mockTransactions;

      await useFinanceStore.getState().fetchTransactions("household-1");

      const state = useFinanceStore.getState();
      expect(state.transactions).toEqual(mockTransactions);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should fetch transactions for specific month", async () => {
      const mockTransactions: Transaction[] = [
        { ...mockTransaction, date: "2024-02-15" },
      ];
      mockData.transactions = mockTransactions;

      await useFinanceStore.getState().fetchTransactions("household-1", "2024-02");

      const state = useFinanceStore.getState();
      expect(state.transactions).toEqual(mockTransactions);
    });

    it("should handle empty transaction list", async () => {
      mockData.transactions = [];

      await useFinanceStore.getState().fetchTransactions("household-1");

      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.transactions).toEqual([]);
    });

    it("should handle fetch error", async () => {
      mockData.transactions = null;

      await useFinanceStore.getState().fetchTransactions("household-1");

      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("calculateMonthlySummary", () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should calculate monthly summary correctly", async () => {
      const mockTransactions: Transaction[] = [
        { ...mockTransaction, type: "expense", amount: 1500 },
        { ...mockTransaction, id: "txn-2", type: "income", amount: 5000 },
        { ...mockTransaction, id: "txn-3", type: "expense", amount: 500 },
      ];
      mockData.transactions = mockTransactions;

      await useFinanceStore.getState().calculateMonthlySummary("household-1");

      const state = useFinanceStore.getState();
      expect(state.monthlySummary).toEqual({
        household_id: "household-1",
        month: expect.any(String),
        total_income: 5000,
        total_expenses: 2000,
        balance: 3000,
      });
    });

    it("should calculate summary for specific month", async () => {
      mockData.transactions = [
        { ...mockTransaction, date: "2024-02-15", type: "income", amount: 3000 },
      ];

      await useFinanceStore.getState().calculateMonthlySummary("household-1", "2024-02");

      const state = useFinanceStore.getState();
      expect(state.monthlySummary?.month).toBe("2024-02");
      expect(state.monthlySummary?.total_income).toBe(3000);
    });

    it("should handle empty transaction list", async () => {
      mockData.transactions = [];

      await useFinanceStore.getState().calculateMonthlySummary("household-1");

      const state = useFinanceStore.getState();
      expect(state.monthlySummary).toEqual({
        household_id: "household-1",
        month: expect.any(String),
        total_income: 0,
        total_expenses: 0,
        balance: 0,
      });
    });

    it("should handle calculation error", async () => {
      mockData.transactions = null;

      await useFinanceStore.getState().calculateMonthlySummary("household-1");

      const state = useFinanceStore.getState();
      expect(state.monthlySummary).toBeNull();
    });
  });

  describe("createBill", () => {
    it("should create bill successfully", async () => {
      const newBill: Partial<Bill> = {
        household_id: "household-1",
        name: "Internet",
        amount: 100,
        is_recurring: true,
        due_day: 15,
        current_month_status: "pending",
        alert_days_before: 3,
        auto_debit: false,
      };

      const result = await useFinanceStore.getState().createBill(newBill);

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.bills[0]).toMatchObject({
        name: "Internet",
        amount: 100,
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should schedule notification for new pending bill", async () => {
      const newBill: Partial<Bill> = {
        household_id: "household-1",
        name: "Internet",
        current_month_status: "pending",
      };

      await useFinanceStore.getState().createBill(newBill);

      expect(notificationService.scheduleBillReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Internet",
          current_month_status: "pending",
        })
      );
    });

    it("should not schedule notification for paid bill", async () => {
      const newBill: Partial<Bill> = {
        household_id: "household-1",
        name: "Internet",
        current_month_status: "paid",
      };

      const createdBill: Bill = {
        ...mockBill,
        ...newBill,
        id: "bill-new",
        current_month_status: "paid",
      };

      mockData.bills = [createdBill];

      await useFinanceStore.getState().createBill(newBill);

      expect(notificationService.scheduleBillReminder).not.toHaveBeenCalled();
    });

    it("should sort bills by due_day after creation", async () => {
      useFinanceStore.setState({
        bills: [{ ...mockBill, due_day: 20 }],
      });

      await useFinanceStore.getState().createBill({
        household_id: "household-1",
        name: "New Bill",
        due_day: 5,
      });

      const state = useFinanceStore.getState();
      expect(state.bills[0].due_day).toBe(5);
      expect(state.bills[1].due_day).toBe(20);
    });

    it("should handle creation error", async () => {
      mockData.bills = null;

      const result = await useFinanceStore.getState().createBill({
        household_id: "household-1",
        name: "Test",
      });

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("updateBill", () => {
    beforeEach(() => {
      useFinanceStore.setState({
        bills: [mockBill],
      });
    });

    it("should update bill successfully", async () => {
      const updates = { name: "Aluguel Atualizado", amount: 1600 };
      const updatedBill = { ...mockBill, ...updates };

      mockData.bills = [updatedBill];

      const result = await useFinanceStore.getState().updateBill("bill-1", updates);

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.bills[0].name).toBe("Aluguel Atualizado");
      expect(state.bills[0].amount).toBe(1600);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should reschedule notification when updating pending bill", async () => {
      const updates = { due_day: 15 };
      const updatedBill = { ...mockBill, ...updates, current_month_status: "pending" as const };

      mockData.bills = [updatedBill];

      await useFinanceStore.getState().updateBill("bill-1", updates);

      expect(notificationService.scheduleBillReminder).toHaveBeenCalledWith(updatedBill);
    });

    it("should cancel notification when bill is marked as paid", async () => {
      const updates = { current_month_status: "paid" as const };
      const updatedBill = { ...mockBill, ...updates };

      mockData.bills = [updatedBill];

      await useFinanceStore.getState().updateBill("bill-1", updates);

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("bill_bill-1");
    });

    it("should handle update error", async () => {
      mockData.bills = null;

      const result = await useFinanceStore.getState().updateBill("bill-1", { name: "Test" });

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("deleteBill", () => {
    beforeEach(() => {
      useFinanceStore.setState({
        bills: [mockBill],
      });
    });

    it("should delete bill successfully", async () => {
      mockData.bills = [];

      const result = await useFinanceStore.getState().deleteBill("bill-1");

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.bills).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should cancel notification when deleting bill", async () => {
      mockData.bills = [];

      await useFinanceStore.getState().deleteBill("bill-1");

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("bill_bill-1");
    });

    it("should handle delete of already deleted bill", async () => {
      await useFinanceStore.getState().deleteBill("bill-1");

      const result = await useFinanceStore.getState().deleteBill("bill-1");

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.bills).toHaveLength(0);
    });

    it("should handle delete error", async () => {
      mockData.bills = null;

      const result = await useFinanceStore.getState().deleteBill("bill-1");

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("markBillAsPaid", () => {
    beforeEach(() => {
      useFinanceStore.setState({
        bills: [mockBill],
      });
    });

    it("should mark bill as paid with specified amount", async () => {
      const paidBill = {
        ...mockBill,
        current_month_status: "paid" as const,
        current_month_paid_at: expect.any(String),
        current_month_paid_amount: 1600,
      };

      mockData.bills = [paidBill];

      const result = await useFinanceStore.getState().markBillAsPaid("bill-1", 1600);

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.bills[0].current_month_status).toBe("paid");
      expect(state.bills[0].current_month_paid_amount).toBe(1600);
    });

    it("should mark bill as paid with default amount", async () => {
      const paidBill = {
        ...mockBill,
        current_month_status: "paid" as const,
        current_month_paid_at: expect.any(String),
        current_month_paid_amount: 1500,
      };

      mockData.bills = [paidBill];

      const result = await useFinanceStore.getState().markBillAsPaid("bill-1");

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.bills[0].current_month_paid_amount).toBe(1500);
    });

    it("should return error if bill not found", async () => {
      useFinanceStore.setState({ bills: [] });

      const result = await useFinanceStore.getState().markBillAsPaid("bill-1");

      expect(result.error).toBe("Bill not found");
    });

    it("should cancel notification when marking bill as paid", async () => {
      const paidBill = {
        ...mockBill,
        current_month_status: "paid" as const,
      };

      mockData.bills = [paidBill];

      await useFinanceStore.getState().markBillAsPaid("bill-1");

      expect(notificationService.cancelNotificationsByTag).toHaveBeenCalledWith("bill_bill-1");
    });
  });

  describe("createTransaction", () => {
    it("should create transaction successfully", async () => {
      const newTransaction: Partial<Transaction> = {
        household_id: "household-1",
        description: "Compras supermercado",
        amount: 250,
        type: "expense",
        date: "2024-01-20",
      };

      const result = await useFinanceStore.getState().createTransaction(newTransaction);

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.transactions[0]).toMatchObject({
        description: "Compras supermercado",
        amount: 250,
      });
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should recalculate summary after creating transaction", async () => {
      const calculateMonthlySummarySpy = jest.spyOn(
        useFinanceStore.getState(),
        "calculateMonthlySummary"
      );

      await useFinanceStore.getState().createTransaction({
        household_id: "household-1",
        description: "Test",
        amount: 100,
        type: "expense",
        date: "2024-01-20",
      });

      expect(calculateMonthlySummarySpy).toHaveBeenCalledWith("household-1");
    });

    it("should add transaction to beginning of list", async () => {
      useFinanceStore.setState({
        transactions: [mockTransaction],
      });

      await useFinanceStore.getState().createTransaction({
        household_id: "household-1",
        description: "New Transaction",
        amount: 100,
        type: "expense",
        date: "2024-01-20",
      });

      const state = useFinanceStore.getState();
      expect(state.transactions[0].description).toBe("New Transaction");
      expect(state.transactions[1].id).toBe("txn-1");
    });

    it("should handle creation error", async () => {
      mockData.transactions = null;

      const result = await useFinanceStore.getState().createTransaction({
        household_id: "household-1",
        description: "Test",
        amount: 100,
        type: "expense",
        date: "2024-01-20",
      });

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("updateTransaction", () => {
    beforeEach(() => {
      useFinanceStore.setState({
        transactions: [mockTransaction],
      });
    });

    it("should update transaction successfully", async () => {
      const updates = { description: "Aluguel janeiro", amount: 1600 };
      const updatedTransaction = { ...mockTransaction, ...updates };

      mockData.transactions = [updatedTransaction];

      const result = await useFinanceStore.getState().updateTransaction("txn-1", updates);

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.transactions[0].description).toBe("Aluguel janeiro");
      expect(state.transactions[0].amount).toBe(1600);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should recalculate summary after updating transaction", async () => {
      const calculateMonthlySummarySpy = jest.spyOn(
        useFinanceStore.getState(),
        "calculateMonthlySummary"
      );

      const updatedTransaction = { ...mockTransaction, amount: 1600 };
      mockData.transactions = [updatedTransaction];

      await useFinanceStore.getState().updateTransaction("txn-1", { amount: 1600 });

      expect(calculateMonthlySummarySpy).toHaveBeenCalledWith("household-1");
    });

    it("should handle update error", async () => {
      mockData.transactions = null;

      const result = await useFinanceStore.getState().updateTransaction("txn-1", {
        amount: 1600,
      });

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("deleteTransaction", () => {
    beforeEach(() => {
      useFinanceStore.setState({
        transactions: [mockTransaction],
      });
    });

    it("should delete transaction successfully", async () => {
      mockData.transactions = [];

      const result = await useFinanceStore.getState().deleteTransaction("txn-1");

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.transactions).toHaveLength(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should recalculate summary after deleting transaction", async () => {
      const calculateMonthlySummarySpy = jest.spyOn(
        useFinanceStore.getState(),
        "calculateMonthlySummary"
      );

      mockData.transactions = [];

      await useFinanceStore.getState().deleteTransaction("txn-1");

      expect(calculateMonthlySummarySpy).toHaveBeenCalledWith("household-1");
    });

    it("should handle delete of already deleted transaction", async () => {
      await useFinanceStore.getState().deleteTransaction("txn-1");

      const result = await useFinanceStore.getState().deleteTransaction("txn-1");

      expect(result.error).toBeNull();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.transactions).toHaveLength(0);
    });

    it("should handle delete error", async () => {
      mockData.transactions = null;

      const result = await useFinanceStore.getState().deleteTransaction("txn-1");

      expect(result.error).toBeTruthy();
      const state = useFinanceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useFinanceStore.setState({ error: "Some error" });

      useFinanceStore.getState().clearError();

      const state = useFinanceStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useFinanceStore.setState({
        error: "Some error",
        bills: [mockBill],
        transactions: [mockTransaction],
        isLoading: true,
      });

      useFinanceStore.getState().clearError();

      const state = useFinanceStore.getState();
      expect(state.error).toBeNull();
      expect(state.bills).toHaveLength(1);
      expect(state.transactions).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    const testBills: Bill[] = [
      { ...mockBill, id: "bill-pending", current_month_status: "pending" },
      { ...mockBill, id: "bill-paid", current_month_status: "paid" },
      { ...mockBill, id: "bill-overdue", current_month_status: "overdue", amount: 1000 },
      { ...mockBill, id: "bill-pending-2", current_month_status: "pending", amount: 500 },
    ];

    describe("getPendingBills", () => {
      it("should return only pending bills", () => {
        const result = getPendingBills(testBills);

        expect(result).toHaveLength(2);
        result.forEach((bill) => {
          expect(bill.current_month_status).toBe("pending");
        });
      });

      it("should return empty array when no pending bills", () => {
        const bills = testBills.filter((b) => b.current_month_status !== "pending");
        const result = getPendingBills(bills);

        expect(result).toEqual([]);
      });
    });

    describe("getPaidBills", () => {
      it("should return only paid bills", () => {
        const result = getPaidBills(testBills);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bill-paid");
      });

      it("should return empty array when no paid bills", () => {
        const bills = testBills.filter((b) => b.current_month_status !== "paid");
        const result = getPaidBills(bills);

        expect(result).toEqual([]);
      });
    });

    describe("getOverdueBills", () => {
      it("should return only overdue bills", () => {
        const result = getOverdueBills(testBills);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("bill-overdue");
      });

      it("should return empty array when no overdue bills", () => {
        const bills = testBills.filter((b) => b.current_month_status !== "overdue");
        const result = getOverdueBills(bills);

        expect(result).toEqual([]);
      });
    });

    describe("getTotalBillsAmount", () => {
      it("should calculate total amount of all bills", () => {
        const result = getTotalBillsAmount(testBills);

        expect(result).toBe(4500);
      });

      it("should return 0 for empty bill list", () => {
        const result = getTotalBillsAmount([]);

        expect(result).toBe(0);
      });
    });

    describe("getPendingBillsAmount", () => {
      it("should calculate total amount of pending bills", () => {
        const result = getPendingBillsAmount(testBills);

        expect(result).toBe(2000);
      });

      it("should return 0 when no pending bills", () => {
        const bills = testBills.filter((b) => b.current_month_status !== "pending");
        const result = getPendingBillsAmount(bills);

        expect(result).toBe(0);
      });
    });

    describe("getExpensesByCategory", () => {
      const testTransactions: Transaction[] = [
        {
          ...mockTransaction,
          id: "txn-1",
          type: "expense",
          amount: 1500,
          category: { ...mockCategory, name: "Moradia", color: "#3B82F6" },
        },
        {
          ...mockTransaction,
          id: "txn-2",
          type: "expense",
          amount: 500,
          category: { ...mockCategory, name: "Alimentação", color: "#10B981" },
        },
        {
          ...mockTransaction,
          id: "txn-3",
          type: "expense",
          amount: 1000,
          category: { ...mockCategory, name: "Moradia", color: "#3B82F6" },
        },
        {
          ...mockTransaction,
          id: "txn-4",
          type: "income",
          amount: 5000,
        },
      ];

      it("should group expenses by category", () => {
        const result = getExpensesByCategory(testTransactions);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          name: "Moradia",
          total: 2500,
          color: "#3B82F6",
        });
        expect(result[1]).toMatchObject({
          name: "Alimentação",
          total: 500,
          color: "#10B981",
        });
      });

      it("should sort categories by total amount descending", () => {
        const result = getExpensesByCategory(testTransactions);

        expect(result[0].total).toBeGreaterThan(result[1].total);
      });

      it("should only include expenses, not income", () => {
        const result = getExpensesByCategory(testTransactions);

        const totalAmount = result.reduce((sum, cat) => sum + cat.total, 0);
        expect(totalAmount).toBe(3000);
      });

      it("should use 'Outros' for transactions without category", () => {
        const transactionsWithoutCategory: Transaction[] = [
          { ...mockTransaction, type: "expense", amount: 100, category: null },
        ];

        const result = getExpensesByCategory(transactionsWithoutCategory);

        expect(result[0].name).toBe("Outros");
        expect(result[0].color).toBe("#6B7280");
      });

      it("should return empty array for empty transaction list", () => {
        const result = getExpensesByCategory([]);

        expect(result).toEqual([]);
      });

      it("should return empty array when only income transactions", () => {
        const incomeOnly: Transaction[] = [
          { ...mockTransaction, type: "income", amount: 5000 },
        ];

        const result = getExpensesByCategory(incomeOnly);

        expect(result).toEqual([]);
      });
    });

    describe("formatCurrency", () => {
      it("should format positive values as BRL currency", () => {
        const result = formatCurrency(1500);

        expect(result).toContain("1.500");
        expect(result).toContain("R$");
      });

      it("should format negative values as BRL currency", () => {
        const result = formatCurrency(-500);

        expect(result).toContain("500");
        expect(result).toContain("R$");
      });

      it("should format zero as BRL currency", () => {
        const result = formatCurrency(0);

        expect(result).toContain("0");
        expect(result).toContain("R$");
      });

      it("should format decimal values correctly", () => {
        const result = formatCurrency(1234.56);

        expect(result).toContain("1.234");
        expect(result).toContain("56");
      });
    });
  });
});
