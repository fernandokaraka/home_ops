// User and Auth Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  household_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  plan_type: 'free' | 'premium_individual' | 'premium_family';
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user?: User;
}

export type PlanType = 'free' | 'premium_individual' | 'premium_family';

export const PLAN_LIMITS: Record<PlanType, number> = {
  free: 2,
  premium_individual: 1,
  premium_family: 6,
};

export const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Gratuito',
  premium_individual: 'Premium Individual',
  premium_family: 'Premium Familia',
};

// Task Types
export interface TaskCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

export interface Task {
  id: string;
  household_id: string;
  category_id?: string | null;
  category?: TaskCategory | null;
  title: string;
  description?: string | null;
  is_recurring: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'custom' | null;
  recurrence_days?: number[] | null;
  recurrence_interval: number;
  due_date?: string | null;
  due_time?: string | null;
  next_occurrence?: string | null;
  status: 'pending' | 'completed' | 'skipped';
  completed_at?: string | null;
  completed_by?: string | null;
  assigned_to?: string | null;
  priority: 1 | 2 | 3;
  estimated_minutes?: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  completed_by: string;
  completed_at: string;
  notes?: string;
}

// Maintenance Types
export interface MaintenanceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
}

export interface MaintenanceItem {
  id: string;
  household_id: string;
  category_id?: string | null;
  category?: MaintenanceCategory | null;
  name: string;
  brand?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  warranty_until?: string | null;
  maintenance_interval_months?: number | null;
  last_maintenance_date?: string | null;
  next_maintenance_date?: string | null;
  preferred_provider?: string | null;
  provider_phone?: string | null;
  manual_url?: string | null;
  receipt_url?: string | null;
  alert_days_before: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceHistory {
  id: string;
  item_id: string;
  maintenance_date: string;
  description?: string | null;
  cost?: number | null;
  provider?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  created_at: string;
}

// Finance Types
export interface FinanceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  is_default: boolean;
}

export interface Bill {
  id: string;
  household_id: string;
  category_id?: string | null;
  category?: FinanceCategory | null;
  name: string;
  amount: number;
  is_recurring: boolean;
  due_day?: number | null;
  current_month_status: 'pending' | 'paid' | 'overdue';
  current_month_paid_at?: string | null;
  current_month_paid_amount?: number | null;
  alert_days_before: number;
  payment_method?: string | null;
  auto_debit: boolean;
  notes?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  household_id: string;
  category_id?: string | null;
  category?: FinanceCategory | null;
  description: string;
  amount: number;
  type: 'expense' | 'income';
  date: string;
  bill_id?: string | null;
  notes?: string | null;
  receipt_url?: string | null;
  created_by: string;
  created_at: string;
}

// Monthly Summary
export interface MonthlySummary {
  household_id: string;
  month: string;
  total_expenses: number;
  total_income: number;
  balance: number;
}

// Inventory Types
export type InventoryLocation = 'pantry' | 'fridge' | 'freezer' | 'bathroom' | 'cleaning' | 'other';
export type InventoryUnit = 'un' | 'kg' | 'g' | 'l' | 'ml' | 'pack';
export type ShoppingPriority = 'low' | 'normal' | 'high';

export interface InventoryCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  location: InventoryLocation;
  is_default: boolean;
}

export interface InventoryItem {
  id: string;
  household_id: string;
  category_id: string | null;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  min_quantity: number | null;
  expiration_date: string | null;
  location: InventoryLocation;
  is_recurring: boolean;
  purchase_interval_days: number | null;
  last_purchase_date: string | null;
  notes: string | null;
  barcode: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: InventoryCategory | null;
}

export interface ShoppingListItem {
  id: string;
  household_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit: InventoryUnit;
  is_checked: boolean;
  added_by: string;
  added_at: string;
  checked_at: string | null;
  priority: ShoppingPriority;
  notes: string | null;
  inventory_item?: InventoryItem | null;
}

// Inventory location labels
export const LOCATION_LABELS: Record<InventoryLocation, string> = {
  pantry: 'Despensa',
  fridge: 'Geladeira',
  freezer: 'Freezer',
  bathroom: 'Banheiro',
  cleaning: 'Limpeza',
  other: 'Outro',
};

// Inventory unit labels
export const UNIT_LABELS: Record<InventoryUnit, string> = {
  un: 'Unidade(s)',
  kg: 'Kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
  pack: 'Pacote(s)',
};

// Shopping priority labels
export const PRIORITY_LABELS: Record<ShoppingPriority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
};
