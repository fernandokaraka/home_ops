import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import * as householdStore from "@/stores/householdStore";

jest.mock("@/stores/householdStore", () => ({
  validateInviteCode: jest.fn(),
}));

describe("Authentication Integration Tests", () => {
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

  describe("Sign Up Flow", () => {
    it("should successfully sign up a new user without invite code", async () => {
      const email = "newuser@example.com";
      const password = "password123";
      const name = "New User";

      const { error } = await useAuthStore.getState().signUp(email, password, name);

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.session?.user.email).toBe(email);
      expect(state.user).toBeDefined();
      expect(state.user?.name).toBe(name);
      expect(state.household).toBeDefined();
      expect(state.household?.name).toBe("Minha Casa");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should successfully sign up and join existing household with valid invite code", async () => {
      const existingHousehold = {
        id: "existing-household-id",
        name: "Existing Household",
        invite_code: "VALID123",
        plan_type: "free" as const,
        created_by: "other-user",
        created_at: new Date().toISOString(),
      };

      mockData.households = [existingHousehold];

      (householdStore.validateInviteCode as jest.Mock).mockResolvedValue({
        household: existingHousehold,
        error: null,
      });

      const email = "newuser@example.com";
      const password = "password123";
      const name = "New User";
      const inviteCode = "VALID123";

      const { error } = await useAuthStore.getState().signUp(email, password, name, inviteCode);

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.user?.name).toBe(name);
      expect(state.user?.household_id).toBe(existingHousehold.id);
      expect(state.household).toBeDefined();
      expect(state.household?.id).toBe(existingHousehold.id);
      expect(state.household?.name).toBe("Existing Household");
    });

    it("should fail sign up with invalid invite code", async () => {
      (householdStore.validateInviteCode as jest.Mock).mockResolvedValue({
        household: null,
        error: "Código de convite inválido",
      });

      const email = "newuser@example.com";
      const password = "password123";
      const name = "New User";
      const inviteCode = "INVALID";

      const { error } = await useAuthStore.getState().signUp(email, password, name, inviteCode);

      expect(error).toBeDefined();
      expect(error?.message).toBe("Código de convite inválido");

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Código de convite inválido");
    });

    it("should fail sign up with empty email", async () => {
      const mockSignUp = supabase.auth.signUp as jest.Mock;
      mockSignUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid email or password" },
      });

      const { error } = await useAuthStore.getState().signUp("", "password123", "Test User");

      expect(error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isLoading).toBe(false);
    });

    it("should fail sign up with short password", async () => {
      const mockSignUp = supabase.auth.signUp as jest.Mock;
      mockSignUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Password should be at least 6 characters" },
      });

      const { error } = await useAuthStore.getState().signUp("test@example.com", "123", "Test User");

      expect(error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.error).toBe("A senha deve ter pelo menos 6 caracteres");
    });

    it("should fail sign up with existing email", async () => {
      const mockSignUp = supabase.auth.signUp as jest.Mock;
      mockSignUp.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "User already registered" },
      });

      const { error } = await useAuthStore.getState().signUp(
        "existing@example.com",
        "password123",
        "Test User"
      );

      expect(error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.error).toBe("Este email já está cadastrado");
    });
  });

  describe("Sign In Flow", () => {
    it("should successfully sign in an existing user", async () => {
      const email = "test@example.com";
      const password = "password123";

      const mockUser = {
        id: "mock-user-id",
        email,
        name: "Test User",
        household_id: "household-123",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockHousehold = {
        id: "household-123",
        name: "Test Household",
        invite_code: "TEST123",
        plan_type: "free" as const,
        created_by: "mock-user-id",
        created_at: new Date().toISOString(),
      };

      mockData.profiles = [mockUser];
      mockData.households = [mockHousehold];

      const { error } = await useAuthStore.getState().signIn(email, password);

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.session?.user.email).toBe(email);
      expect(state.user).toBeDefined();
      expect(state.user?.id).toBe("mock-user-id");
      expect(state.user?.name).toBe("Test User");
      expect(state.household).toBeDefined();
      expect(state.household?.name).toBe("Test Household");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should successfully sign in user without household", async () => {
      const email = "test@example.com";
      const password = "password123";

      const mockUser = {
        id: "user-123",
        email,
        name: "Test User",
        household_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockData.profiles = [mockUser];

      const { error } = await useAuthStore.getState().signIn(email, password);

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.household).toBeNull();
    });

    it("should fail sign in with invalid credentials", async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" },
      });

      const { error } = await useAuthStore.getState().signIn("wrong@example.com", "wrongpassword");

      expect(error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
      expect(state.error).toBe("Email ou senha incorretos");
      expect(state.isLoading).toBe(false);
    });

    it("should fail sign in with empty credentials", async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" },
      });

      const { error } = await useAuthStore.getState().signIn("", "");

      expect(error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
    });

    it("should translate common auth errors to Portuguese", async () => {
      const testCases = [
        {
          errorMessage: "Invalid login credentials",
          expectedTranslation: "Email ou senha incorretos",
        },
        {
          errorMessage: "Email not confirmed",
          expectedTranslation: "Email não confirmado. Verifique sua caixa de entrada.",
        },
        {
          errorMessage: "User not found",
          expectedTranslation: "Usuário não encontrado",
        },
        {
          errorMessage: "Email rate limit exceeded",
          expectedTranslation: "Muitas tentativas. Aguarde alguns minutos.",
        },
      ];

      for (const testCase of testCases) {
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

        const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
        mockSignIn.mockResolvedValueOnce({
          data: { session: null, user: null },
          error: { message: testCase.errorMessage },
        });

        await useAuthStore.getState().signIn("test@example.com", "password");

        const state = useAuthStore.getState();
        expect(state.error).toBe(testCase.expectedTranslation);
      }
    });
  });

  describe("Sign Out Flow", () => {
    it("should successfully sign out and clear all auth state", async () => {
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
          invite_code: "TEST123",
          plan_type: "free",
          created_by: "user-123",
          created_at: new Date().toISOString(),
        },
      ];

      await useAuthStore.getState().initialize();

      const stateBeforeSignOut = useAuthStore.getState();
      expect(stateBeforeSignOut.session).toBeDefined();
      expect(stateBeforeSignOut.user).toBeDefined();
      expect(stateBeforeSignOut.household).toBeDefined();

      await useAuthStore.getState().signOut();

      const stateAfterSignOut = useAuthStore.getState();
      expect(stateAfterSignOut.session).toBeNull();
      expect(stateAfterSignOut.user).toBeNull();
      expect(stateAfterSignOut.household).toBeNull();
      expect(stateAfterSignOut.isLoading).toBe(false);
      expect(stateAfterSignOut.error).toBeNull();
    });

    it("should handle sign out when not signed in", async () => {
      const initialState = useAuthStore.getState();
      expect(initialState.session).toBeNull();

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
    });
  });

  describe("Session Initialization", () => {
    it("should initialize with no existing session", async () => {
      mockData.session = null;

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
    });

    it("should initialize with existing session and restore user state", async () => {
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
          invite_code: "TEST123",
          plan_type: "free",
          created_by: "user-123",
          created_at: new Date().toISOString(),
        },
      ];

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.session).toEqual(mockSession);
      expect(state.user).toBeDefined();
      expect(state.user?.id).toBe("user-123");
      expect(state.user?.name).toBe("Test User");
      expect(state.household).toBeDefined();
      expect(state.household?.name).toBe("Test Household");
    });

    it("should initialize with session but without household", async () => {
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
          household_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.household).toBeNull();
    });

    it("should handle initialization errors gracefully", async () => {
      const mockGetSession = supabase.auth.getSession as jest.Mock;
      mockGetSession.mockRejectedValueOnce(new Error("Network error"));

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.isInitialized).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe("Complete Authentication Workflow", () => {
    it("should complete full workflow: sign up -> sign out -> sign in", async () => {
      const email = "workflow@example.com";
      const password = "password123";
      const name = "Workflow User";

      const { error: signUpError } = await useAuthStore.getState().signUp(email, password, name);
      expect(signUpError).toBeNull();

      let state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.household).toBeDefined();
      const householdId = state.household?.id;

      await useAuthStore.getState().signOut();

      state = useAuthStore.getState();
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();

      const mockUser = {
        id: state.user?.id || "user-workflow",
        email,
        name,
        household_id: householdId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockHousehold = {
        id: householdId || "household-workflow",
        name: `Casa de ${name}`,
        invite_code: "WORK123",
        plan_type: "free" as const,
        created_by: mockUser.id,
        created_at: new Date().toISOString(),
      };

      mockData.profiles = [mockUser];
      mockData.households = [mockHousehold];

      const { error: signInError } = await useAuthStore.getState().signIn(email, password);
      expect(signInError).toBeNull();

      state = useAuthStore.getState();
      expect(state.session).toBeDefined();
      expect(state.user).toBeDefined();
      expect(state.household).toBeDefined();
    });

    it("should handle multiple sign in attempts with rate limiting", async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;

      for (let i = 0; i < 3; i++) {
        mockSignIn.mockResolvedValueOnce({
          data: { session: null, user: null },
          error: { message: "Invalid login credentials" },
        });

        await useAuthStore.getState().signIn("test@example.com", "wrongpassword");

        const state = useAuthStore.getState();
        expect(state.error).toBe("Email ou senha incorretos");
      }

      mockSignIn.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: {
          message: "For security purposes, you can only request this once every 60 seconds",
        },
      });

      await useAuthStore.getState().signIn("test@example.com", "wrongpassword");

      const state = useAuthStore.getState();
      expect(state.error).toBe("Por segurança, aguarde 60 segundos para tentar novamente");
    });
  });

  describe("Error Clearing", () => {
    it("should clear error state", async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValueOnce({
        data: { session: null, user: null },
        error: { message: "Invalid login credentials" },
      });

      await useAuthStore.getState().signIn("test@example.com", "wrongpassword");

      let state = useAuthStore.getState();
      expect(state.error).toBe("Email ou senha incorretos");

      useAuthStore.getState().clearError();

      state = useAuthStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe("Household Integration", () => {
    it("should create household automatically on sign up without invite code", async () => {
      const email = "newuser@example.com";
      const password = "password123";
      const name = "New User";

      const { error } = await useAuthStore.getState().signUp(email, password, name);

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.household).toBeDefined();
      expect(state.household?.name).toBe("Minha Casa");
      expect(state.user?.household_id).toBe(state.household?.id);
    });

    it("should join existing household with valid invite code on sign up", async () => {
      const existingHousehold = {
        id: "existing-household",
        name: "Existing Home",
        invite_code: "EXIST123",
        plan_type: "free" as const,
        created_by: "other-user",
        created_at: new Date().toISOString(),
      };

      mockData.households = [existingHousehold];

      (householdStore.validateInviteCode as jest.Mock).mockResolvedValue({
        household: existingHousehold,
        error: null,
      });

      const { error } = await useAuthStore
        .getState()
        .signUp("newmember@example.com", "password123", "New Member", "EXIST123");

      expect(error).toBeNull();

      const state = useAuthStore.getState();
      expect(state.household).toBeDefined();
      expect(state.household?.id).toBe("existing-household");
      expect(state.household?.name).toBe("Existing Home");
      expect(state.user?.household_id).toBe("existing-household");
    });

    it("should prevent sign up with invalid invite code", async () => {
      (householdStore.validateInviteCode as jest.Mock).mockResolvedValue({
        household: null,
        error: "Código de convite inválido",
      });

      const { error } = await useAuthStore
        .getState()
        .signUp("test@example.com", "password123", "Test User", "INVALID");

      expect(error).toBeDefined();
      expect(error?.message).toBe("Código de convite inválido");

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.household).toBeNull();
      expect(state.error).toBe("Código de convite inválido");
    });
  });
});
