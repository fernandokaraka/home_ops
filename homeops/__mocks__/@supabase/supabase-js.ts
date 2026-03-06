import type { Session, User as SupabaseUser, AuthError } from "@supabase/supabase-js";

// Mock data store for tests
export const mockData = {
  session: null as Session | null,
  user: null as SupabaseUser | null,
  profiles: [] as any[],
  households: [] as any[],
  tasks: [] as any[],
  task_categories: [] as any[],
  task_completions: [] as any[],
  maintenance_items: [] as any[],
  maintenance_categories: [] as any[],
  maintenance_history: [] as any[],
  bills: [] as any[],
  transactions: [] as any[],
  finance_categories: [] as any[],
  household_members: [] as any[],
  inventory_items: [] as any[],
  inventory_categories: [] as any[],
  shopping_list: [] as any[],
};

// Query builder mock
class MockQueryBuilder {
  private tableName: string;
  private selectFields: string = "*";
  private filters: Array<{ column: string; value: any; operator: string }> = [];
  private orderBy: Array<{ column: string; ascending: boolean; nullsFirst: boolean }> = [];
  private limitValue?: number;
  private isSingle: boolean = false;
  private countMode: boolean = false;
  private headMode: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = "*", options?: { count?: "exact"; head?: boolean }) {
    this.selectFields = fields;
    if (options?.count === "exact") {
      this.countMode = true;
    }
    if (options?.head === true) {
      this.headMode = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value, operator: "eq" });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, value, operator: "gte" });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, value, operator: "lte" });
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this.orderBy.push({
      column,
      ascending: options?.ascending ?? true,
      nullsFirst: options?.nullsFirst ?? false,
    });
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(data: any) {
    const table = (mockData as any)[this.tableName];

    // Check if table is explicitly set to null to simulate error
    if (table === null) {
      const errorResponse = {
        data: null,
        error: { message: "Database error" },
        select: () => ({
          data: null,
          error: { message: "Database error" },
          single: () => ({
            data: null,
            error: { message: "Database error" },
            then: (resolve: any) => resolve({ data: null, error: { message: "Database error" } }),
          }),
          then: (resolve: any) => resolve({ data: null, error: { message: "Database error" } }),
        }),
        single: () => ({
          data: null,
          error: { message: "Database error" },
          then: (resolve: any) => resolve({ data: null, error: { message: "Database error" } }),
        }),
        then: (resolve: any) => resolve({ data: null, error: { message: "Database error" } }),
      };
      return errorResponse;
    }

    const actualTable = table || [];

    // Handle both single and bulk inserts
    const isArray = Array.isArray(data);
    const dataArray = isArray ? data : [data];

    const newRecords = dataArray.map((item, index) => ({
      id: `mock-${Date.now()}-${index}`,
      ...item
    }));

    actualTable.push(...newRecords);
    (mockData as any)[this.tableName] = actualTable;

    const resultData = isArray ? newRecords : newRecords[0];

    const builder = this;
    return {
      data: this.isSingle ? newRecords[0] : resultData,
      error: null,
      select: () => {
        return {
          data: resultData,
          error: null,
          single: () => ({
            data: newRecords[0],
            error: null,
            then: (resolve: any) => resolve({ data: newRecords[0], error: null }),
          }),
          then: (resolve: any) => resolve({ data: resultData, error: null }),
        };
      },
      single: () => {
        this.isSingle = true;
        return this;
      },
      then: (resolve: any) => resolve({ data: this.isSingle ? newRecords[0] : resultData, error: null }),
    };
  }

  update(data: any) {
    const table = (mockData as any)[this.tableName];

    // Check if table is explicitly set to null to simulate error
    if (table === null) {
      return {
        data: null,
        error: { message: "Database error" },
        select: () => this,
        single: () => {
          this.isSingle = true;
          return this;
        },
        eq: (column: string, value: any) => {
          this.eq(column, value);
          return this;
        },
      };
    }

    const actualTable = table || [];
    let updated = null;

    for (let i = 0; i < actualTable.length; i++) {
      let matches = true;
      for (const filter of this.filters) {
        if (!this.matchesFilter(actualTable[i], filter)) {
          matches = false;
          break;
        }
      }

      if (matches) {
        actualTable[i] = { ...actualTable[i], ...data };
        updated = actualTable[i];
        break;
      }
    }

    return {
      data: updated,
      error: updated ? null : { message: "Record not found" },
      select: () => this,
      single: () => {
        this.isSingle = true;
        return this;
      },
      eq: (column: string, value: any) => {
        this.eq(column, value);
        return this;
      },
    };
  }

  private matchesFilter(record: any, filter: { column: string; value: any; operator: string }): boolean {
    const recordValue = record[filter.column];
    const filterValue = filter.value;

    switch (filter.operator) {
      case "eq":
        return recordValue === filterValue;
      case "gte":
        return recordValue >= filterValue;
      case "lte":
        return recordValue <= filterValue;
      default:
        return false;
    }
  }

  delete() {
    const table = (mockData as any)[this.tableName];

    // Check if table is explicitly set to null to simulate error
    if (table === null) {
      return {
        data: null,
        error: { message: "Database error" },
        eq: (column: string, value: any) => {
          this.eq(column, value);
          return this;
        },
      };
    }

    const actualTable = table || [];
    const filtered = actualTable.filter((record: any) => {
      for (const filter of this.filters) {
        if (this.matchesFilter(record, filter)) {
          return false;
        }
      }
      return true;
    });

    (mockData as any)[this.tableName] = filtered;

    return {
      data: null,
      error: null,
      eq: (column: string, value: any) => {
        this.eq(column, value);
        return this;
      },
    };
  }

  then(resolve: (value: any) => void) {
    const table = (mockData as any)[this.tableName];

    // Check if table is explicitly set to null to simulate error
    if (table === null) {
      resolve({ data: null, error: { message: "Database error" }, count: null });
      return;
    }

    let results = (table || []).filter((record: any) => {
      for (const filter of this.filters) {
        if (!this.matchesFilter(record, filter)) {
          return false;
        }
      }
      return true;
    });

    // If count mode, return count
    if (this.countMode) {
      const count = results.length;
      if (this.headMode) {
        resolve({ data: null, error: null, count });
      } else {
        resolve({ data: results, error: null, count });
      }
      return;
    }

    // Apply ordering
    if (this.orderBy.length > 0) {
      results.sort((a: any, b: any) => {
        for (const order of this.orderBy) {
          const aVal = a[order.column];
          const bVal = b[order.column];

          if (aVal === null && bVal === null) continue;
          if (aVal === null) return order.nullsFirst ? -1 : 1;
          if (bVal === null) return order.nullsFirst ? 1 : -1;

          if (aVal < bVal) return order.ascending ? -1 : 1;
          if (aVal > bVal) return order.ascending ? 1 : -1;
        }
        return 0;
      });
    }

    // Apply limit
    if (this.limitValue) {
      results = results.slice(0, this.limitValue);
    }

    const data = this.isSingle ? (results[0] || null) : results;
    resolve({ data, error: null });
  }
}

// Mock auth object
const mockAuth = {
  getSession: jest.fn(async () => ({
    data: { session: mockData.session },
    error: null,
  })),

  signInWithPassword: jest.fn(async ({ email, password }: { email: string; password: string }) => {
    // Simple mock: any non-empty credentials work
    if (!email || !password) {
      return {
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" } as AuthError,
      };
    }

    const mockUser: SupabaseUser = {
      id: "mock-user-id",
      email,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: "mock-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: mockUser,
    };

    mockData.session = mockSession;
    mockData.user = mockUser;

    return {
      data: { session: mockSession, user: mockUser },
      error: null,
    };
  }),

  signUp: jest.fn(async ({ email, password, options }: any) => {
    if (!email || !password) {
      return {
        data: { session: null, user: null },
        error: { message: "Invalid email or password" } as AuthError,
      };
    }

    const mockUser: SupabaseUser = {
      id: `mock-user-${Date.now()}`,
      email,
      app_metadata: {},
      user_metadata: options?.data || {},
      aud: "authenticated",
      created_at: new Date().toISOString(),
    };

    const mockSession: Session = {
      access_token: "mock-token",
      refresh_token: "mock-refresh-token",
      expires_in: 3600,
      token_type: "bearer",
      user: mockUser,
    };

    mockData.session = mockSession;
    mockData.user = mockUser;

    return {
      data: { session: mockSession, user: mockUser },
      error: null,
    };
  }),

  signOut: jest.fn(async () => {
    mockData.session = null;
    mockData.user = null;
    return { error: null };
  }),

  onAuthStateChange: jest.fn((callback: (event: string, session: Session | null) => void) => {
    // Return unsubscribe function
    return {
      data: {
        subscription: {
          unsubscribe: jest.fn(),
        },
      },
    };
  }),
};

// Mock Supabase client
const mockSupabaseClient = {
  auth: mockAuth,
  from: (tableName: string) => new MockQueryBuilder(tableName),
};

// Export createClient mock
export const createClient = jest.fn(() => mockSupabaseClient);

// Export mock helpers for tests
export const resetMockData = () => {
  mockData.session = null;
  mockData.user = null;
  mockData.profiles = [];
  mockData.households = [];
  mockData.tasks = [];
  mockData.task_categories = [];
  mockData.task_completions = [];
  mockData.maintenance_items = [];
  mockData.maintenance_categories = [];
  mockData.maintenance_history = [];
  mockData.bills = [];
  mockData.transactions = [];
  mockData.finance_categories = [];
  mockData.household_members = [];
  mockData.inventory_items = [];
  mockData.inventory_categories = [];
  mockData.shopping_list = [];
};

export const setMockSession = (session: Session | null) => {
  mockData.session = session;
};

export const setMockUser = (user: SupabaseUser | null) => {
  mockData.user = user;
};

// Default export for compatibility
export default {
  createClient,
  mockData,
  resetMockData,
  setMockSession,
  setMockUser,
};
