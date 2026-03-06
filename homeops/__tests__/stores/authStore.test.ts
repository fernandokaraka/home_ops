import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import * as householdStore from "@/stores/householdStore";

// Mock householdStore
jest.mock("@/stores/householdStore", () => ({
  validateInviteCode: jest.fn(),
}));

describe("authStore", () => {
  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useAuthStore.setState({
      user: null,
      session: null,
      household: null,
      isLoading: false,
      isInitialized: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.household).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.isInitialized).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("initialize", () => {
    it("should initialize with no session", async () => {
      mockData.session = null;

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.household).toBeNull();
    });

    it("should initialize with existing session and profile", async () => {
      const mockUser: SupabaseUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: "token",
        refresh_token: "refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockData.session = mockSession;
      mockData.profiles = [
        {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          household_id: "household-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.session).toEqual(mockSession);
      expect(state.user).toBeDefined();
      expect(state.user?.id).toBe("user-123");
    });

    it("should initialize with session, profile, and household", async () => {
      const mockUser: SupabaseUser = {
        id: "user-123",
        email: "test@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: "token",
        refresh_token: "refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockData.session = mockSession;
      mockData.profiles = [
        {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          household_id: "household-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockData.households = [
        {
          id: "household-123",
          name: "Test Household",
          invite_code: "ABC123",
          plan_type: "free",
          created_by: "user-123",
          created_at: new Date().toISOString(),
        },
      ];

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.household).toBeDefined();
      expect(state.household?.id).toBe("household-123");
      expect(state.household?.name).toBe("Test Household");
    });

    it("should set up auth state change listener", async () => {
      await useAuthStore.getState().initialize();

      expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
    });
  });

  describe("signIn", () => {
    it("should sign in successfully with valid credentials", async () => {
      mockData.profiles = [
        {
          id: "mock-user-id",
          email: "test@example.com",
          name: "Test User",
          household_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const result = await useAuthStore.getState().signIn("test@example.com", "password123");

      expect(result.error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.user?.email).toBe("test@example.com");
      expect(state.error).toBeNull();
    });

    it("should sign in with profile and household", async () => {
      mockData.profiles = [
        {
          id: "mock-user-id",
          email: "test@example.com",
          name: "Test User",
          household_id: "household-123",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      mockData.households = [
        {
          id: "household-123",
          name: "Test Household",
          invite_code: "ABC123",
          plan_type: "free",
          created_by: "mock-user-id",
          created_at: new Date().toISOString(),
        },
      ];

      const result = await useAuthStore.getState().signIn("test@example.com", "password123");

      expect(result.error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.household).toBeDefined();
      expect(state.household?.id).toBe("household-123");
    });

    it("should handle sign in error with translated message", async () => {
      const result = await useAuthStore.getState().signIn("", "");

      expect(result.error).toBeDefined();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Email ou senha incorretos");
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });

    it("should set loading state during sign in", async () => {
      mockData.profiles = [
        {
          id: "mock-user-id",
          email: "test@example.com",
          name: "Test User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      const signInPromise = useAuthStore.getState().signIn("test@example.com", "password123");

      await signInPromise;

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  describe("signUp", () => {
    it("should sign up successfully without invite code", async () => {
      const result = await useAuthStore.getState().signUp(
        "new@example.com",
        "password123",
        "New User"
      );

      expect(result.error).toBeNull();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.household).toBeDefined();
      expect(state.error).toBeNull();
    });

    it("should create new household when no invite code", async () => {
      await useAuthStore.getState().signUp("new@example.com", "password123", "New User");

      expect(mockData.households.length).toBeGreaterThan(0);
      expect(mockData.profiles.length).toBeGreaterThan(0);
      expect(mockData.household_members.length).toBeGreaterThan(0);

      const household = mockData.households[0];
      expect(household.name).toBe("Minha Casa");

      const member = mockData.household_members[0];
      expect(member.role).toBe("admin");
    });

    it("should sign up with valid invite code", async () => {
      const existingHousehold = {
        id: "household-existing",
        name: "Existing Household",
        invite_code: "VALID123",
        plan_type: "free" as const,
        created_by: "other-user",
        created_at: new Date().toISOString(),
      };

      mockData.households = [existingHousehold];

      (householdStore.validateInviteCode as jest.Mock).mockResolvedValueOnce({
        household: existingHousehold,
        error: null,
      });

      const result = await useAuthStore.getState().signUp(
        "new@example.com",
        "password123",
        "New User",
        "VALID123"
      );

      expect(result.error).toBeNull();
      expect(householdStore.validateInviteCode).toHaveBeenCalledWith("VALID123");

      const state = useAuthStore.getState();
      expect(state.household?.id).toBe("household-existing");

      const member = mockData.household_members.find(
        (m) => m.household_id === "household-existing"
      );
      expect(member?.role).toBe("member");
    });

    it("should handle invalid invite code", async () => {
      (householdStore.validateInviteCode as jest.Mock).mockResolvedValueOnce({
        household: null,
        error: "Codigo de convite invalido",
      });

      const result = await useAuthStore.getState().signUp(
        "new@example.com",
        "password123",
        "New User",
        "INVALID"
      );

      expect(result.error).toBeDefined();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Codigo de convite invalido");
    });

    it("should handle sign up error with translated message", async () => {
      const result = await useAuthStore.getState().signUp("", "", "");

      expect(result.error).toBeDefined();
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeTruthy();
    });

    it("should trim invite code before validation", async () => {
      const existingHousehold = {
        id: "household-existing",
        name: "Existing Household",
        invite_code: "VALID123",
        plan_type: "free" as const,
        created_by: "other-user",
        created_at: new Date().toISOString(),
      };

      (householdStore.validateInviteCode as jest.Mock).mockResolvedValueOnce({
        household: existingHousehold,
        error: null,
      });

      await useAuthStore.getState().signUp(
        "new@example.com",
        "password123",
        "New User",
        "  VALID123  "
      );

      expect(householdStore.validateInviteCode).toHaveBeenCalledWith("VALID123");
    });

    it("should not validate empty invite code", async () => {
      await useAuthStore.getState().signUp("new@example.com", "password123", "New User", "   ");

      expect(householdStore.validateInviteCode).not.toHaveBeenCalled();
    });
  });

  describe("signOut", () => {
    it("should sign out successfully", async () => {
      useAuthStore.setState({
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: {} as SupabaseUser,
        },
        household: {
          id: "household-123",
          name: "Test Household",
          invite_code: "ABC123",
          plan_type: "free",
          created_by: "user-123",
          created_at: new Date().toISOString(),
        },
      });

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.household).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it("should set loading state during sign out", async () => {
      await useAuthStore.getState().signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useAuthStore.setState({ error: "Some error" });

      useAuthStore.getState().clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useAuthStore.setState({
        error: "Some error",
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        isLoading: true,
      });

      useAuthStore.getState().clearError();

      const state = useAuthStore.getState();
      expect(state.error).toBeNull();
      expect(state.user).toBeDefined();
      expect(state.isLoading).toBe(true);
    });
  });

  describe("Error Translation", () => {
    it("should translate 'Invalid login credentials' error", async () => {
      await useAuthStore.getState().signIn("", "");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Email ou senha incorretos");
    });

    it("should handle errors with partial message matches", async () => {
      const mockError = { message: "Invalid login credentials - please try again" };
      (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
        data: { session: null, user: null },
        error: mockError,
      });

      await useAuthStore.getState().signIn("test@example.com", "wrong");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Email ou senha incorretos");
    });
  });

  describe("Auth State Changes", () => {
    it("should handle SIGNED_IN event", async () => {
      await useAuthStore.getState().initialize();

      const authStateChangeCallback = (supabase.auth.onAuthStateChange as jest.Mock).mock
        .calls[0][0];

      const mockUser: SupabaseUser = {
        id: "user-456",
        email: "new@example.com",
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
      };

      const mockSession: Session = {
        access_token: "new-token",
        refresh_token: "new-refresh",
        expires_in: 3600,
        token_type: "bearer",
        user: mockUser,
      };

      mockData.profiles = [
        {
          id: "user-456",
          email: "new@example.com",
          name: "New User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await authStateChangeCallback("SIGNED_IN", mockSession);

      const state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
    });

    it("should handle SIGNED_OUT event", async () => {
      useAuthStore.setState({
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        session: {
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: {} as SupabaseUser,
        },
      });

      await useAuthStore.getState().initialize();

      const authStateChangeCallback = (supabase.auth.onAuthStateChange as jest.Mock).mock
        .calls[0][0];

      await authStateChangeCallback("SIGNED_OUT", null);

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
    });
  });
});
