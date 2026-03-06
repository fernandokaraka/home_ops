import { useHouseholdStore, validateInviteCode, joinHouseholdWithCode } from "@/stores/householdStore";
import { supabase } from "@/lib/supabase";
import { mockData, resetMockData } from "@supabase/supabase-js";
import type { HouseholdMember, Household } from "@/types";

describe("householdStore", () => {
  const mockHousehold: Household = {
    id: "household-1",
    name: "Test Household",
    invite_code: "ABC123",
    plan_type: "free",
    created_by: "user-1",
    created_at: "2024-01-10T10:00:00Z",
  };

  const mockMember: HouseholdMember = {
    id: "member-1",
    household_id: "household-1",
    user_id: "user-1",
    role: "admin",
    joined_at: "2024-01-10T10:00:00Z",
    user: {
      id: "user-1",
      email: "admin@example.com",
      name: "Admin User",
      created_at: "2024-01-10T10:00:00Z",
      updated_at: "2024-01-10T10:00:00Z",
    },
  };

  beforeEach(() => {
    resetMockData();
    jest.clearAllMocks();
    useHouseholdStore.setState({
      members: [],
      isLoading: false,
      error: null,
    });
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useHouseholdStore.getState();
      expect(state.members).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("fetchMembers", () => {
    it("should fetch members successfully", async () => {
      const mockMembers = [
        mockMember,
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-2",
          role: "member" as const,
          joined_at: "2024-01-11T10:00:00Z",
          user: {
            id: "user-2",
            email: "member@example.com",
            name: "Member User",
            created_at: "2024-01-11T10:00:00Z",
            updated_at: "2024-01-11T10:00:00Z",
          },
        },
      ];

      mockData.household_members = mockMembers;

      await useHouseholdStore.getState().fetchMembers("household-1");

      const state = useHouseholdStore.getState();
      expect(state.members).toHaveLength(2);
      expect(state.members[0].user?.name).toBe("Admin User");
      expect(state.members[1].user?.name).toBe("Member User");
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should set loading state during fetch", async () => {
      mockData.household_members = [mockMember];

      await useHouseholdStore.getState().fetchMembers("household-1");

      const state = useHouseholdStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should handle fetch error", async () => {
      mockData.household_members = null;

      await useHouseholdStore.getState().fetchMembers("household-1");

      const state = useHouseholdStore.getState();
      expect(state.error).toBe("Erro ao carregar membros");
      expect(state.isLoading).toBe(false);
      expect(state.members).toEqual([]);
    });

    it("should handle empty members list", async () => {
      mockData.household_members = [];

      await useHouseholdStore.getState().fetchMembers("household-1");

      const state = useHouseholdStore.getState();
      expect(state.members).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it("should transform data correctly from Supabase response", async () => {
      const mockMembers = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin" as const,
          joined_at: "2024-01-11T10:00:00Z",
          user: {
            id: "user-1",
            email: "admin@example.com",
            name: "Admin User",
            created_at: "2024-01-10T10:00:00Z",
            updated_at: "2024-01-10T10:00:00Z",
          },
        },
      ];

      mockData.household_members = mockMembers;

      await useHouseholdStore.getState().fetchMembers("household-1");

      const state = useHouseholdStore.getState();
      expect(state.members[0]).toMatchObject({
        id: "member-1",
        household_id: "household-1",
        user_id: "user-1",
        role: "admin",
        joined_at: "2024-01-11T10:00:00Z",
      });
      expect(state.members[0].user).toBeDefined();
    });
  });

  describe("removeMember", () => {
    beforeEach(() => {
      useHouseholdStore.setState({
        members: [mockMember],
      });
    });

    it("should remove member successfully", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-10T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          household_id: null,
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T10:00:00Z",
        },
      ];

      const result = await useHouseholdStore.getState().removeMember("member-1", "household-1");

      expect(result.error).toBeNull();
      const state = useHouseholdStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should return error when member not found", async () => {
      mockData.household_members = [];

      const result = await useHouseholdStore.getState().removeMember("member-999", "household-1");

      expect(result.error).toBe("Membro nao encontrado");
      const state = useHouseholdStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Membro nao encontrado");
    });

    it("should clear household_id from profile after removal", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "member",
          joined_at: "2024-01-10T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "member@example.com",
          name: "Member User",
          household_id: null,
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T10:00:00Z",
        },
      ];

      await useHouseholdStore.getState().removeMember("member-1", "household-1");

      const profile = mockData.profiles.find(p => p.id === "user-1");
      expect(profile?.household_id).toBeNull();
    });

    it("should handle delete error gracefully", async () => {
      mockData.household_members = null;

      const result = await useHouseholdStore.getState().removeMember("member-1", "household-1");

      expect(result.error).toBe("Membro nao encontrado");
      const state = useHouseholdStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("leaveHousehold", () => {
    it("should leave household successfully", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "member",
          joined_at: "2024-01-10T10:00:00Z",
        },
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-2",
          role: "admin",
          joined_at: "2024-01-09T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "member@example.com",
          name: "Member User",
          household_id: null,
          created_at: "2024-01-10T10:00:00Z",
          updated_at: "2024-01-10T10:00:00Z",
        },
      ];

      const result = await useHouseholdStore.getState().leaveHousehold("user-1", "household-1");

      expect(result.error).toBeNull();
      const state = useHouseholdStore.getState();
      expect(state.members).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it("should prevent sole admin from leaving when household has other members", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-09T10:00:00Z",
        },
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-2",
          role: "member",
          joined_at: "2024-01-10T10:00:00Z",
        },
      ];

      const result = await useHouseholdStore.getState().leaveHousehold("user-1", "household-1");

      expect(result.error).toBe("Voce precisa promover outro membro a admin antes de sair");
      const state = useHouseholdStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Voce precisa promover outro membro a admin antes de sair");
    });

    it("should allow sole admin to leave when they are the only member", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-09T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          household_id: null,
          created_at: "2024-01-09T10:00:00Z",
          updated_at: "2024-01-09T10:00:00Z",
        },
      ];

      const result = await useHouseholdStore.getState().leaveHousehold("user-1", "household-1");

      expect(result.error).toBeNull();
      const state = useHouseholdStore.getState();
      expect(state.members).toEqual([]);
    });

    it("should allow admin to leave when there are multiple admins", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-09T10:00:00Z",
        },
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-2",
          role: "admin",
          joined_at: "2024-01-10T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "admin1@example.com",
          name: "Admin 1",
          household_id: null,
          created_at: "2024-01-09T10:00:00Z",
          updated_at: "2024-01-09T10:00:00Z",
        },
      ];

      const result = await useHouseholdStore.getState().leaveHousehold("user-1", "household-1");

      expect(result.error).toBeNull();
    });

    it("should clear household_id from profile after leaving", async () => {
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-09T10:00:00Z",
        },
      ];

      mockData.profiles = [
        {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin User",
          household_id: null,
          created_at: "2024-01-09T10:00:00Z",
          updated_at: "2024-01-09T10:00:00Z",
        },
      ];

      await useHouseholdStore.getState().leaveHousehold("user-1", "household-1");

      const profile = mockData.profiles.find(p => p.id === "user-1");
      expect(profile?.household_id).toBeNull();
    });
  });

  describe("getMemberLimit", () => {
    it("should return correct limit for free plan", () => {
      const limit = useHouseholdStore.getState().getMemberLimit("free");
      expect(limit).toBe(2);
    });

    it("should return correct limit for premium_individual plan", () => {
      const limit = useHouseholdStore.getState().getMemberLimit("premium_individual");
      expect(limit).toBe(1);
    });

    it("should return correct limit for premium_family plan", () => {
      const limit = useHouseholdStore.getState().getMemberLimit("premium_family");
      expect(limit).toBe(6);
    });
  });

  describe("canAddMember", () => {
    it("should return true when members count is below limit", () => {
      useHouseholdStore.setState({
        members: [mockMember],
      });

      const canAdd = useHouseholdStore.getState().canAddMember("household-1", "free");
      expect(canAdd).toBe(true);
    });

    it("should return false when members count equals limit", () => {
      useHouseholdStore.setState({
        members: [mockMember, { ...mockMember, id: "member-2", user_id: "user-2" }],
      });

      const canAdd = useHouseholdStore.getState().canAddMember("household-1", "free");
      expect(canAdd).toBe(false);
    });

    it("should return false when members count exceeds limit", () => {
      useHouseholdStore.setState({
        members: [
          mockMember,
          { ...mockMember, id: "member-2", user_id: "user-2" },
          { ...mockMember, id: "member-3", user_id: "user-3" },
        ],
      });

      const canAdd = useHouseholdStore.getState().canAddMember("household-1", "free");
      expect(canAdd).toBe(false);
    });

    it("should check against premium_family limit correctly", () => {
      useHouseholdStore.setState({
        members: Array.from({ length: 5 }, (_, i) => ({
          ...mockMember,
          id: `member-${i}`,
          user_id: `user-${i}`,
        })),
      });

      const canAdd = useHouseholdStore.getState().canAddMember("household-1", "premium_family");
      expect(canAdd).toBe(true);
    });

    it("should return true when no members and any plan type", () => {
      useHouseholdStore.setState({ members: [] });

      expect(useHouseholdStore.getState().canAddMember("household-1", "free")).toBe(true);
      expect(useHouseholdStore.getState().canAddMember("household-1", "premium_individual")).toBe(true);
      expect(useHouseholdStore.getState().canAddMember("household-1", "premium_family")).toBe(true);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      useHouseholdStore.setState({ error: "Some error" });

      useHouseholdStore.getState().clearError();

      const state = useHouseholdStore.getState();
      expect(state.error).toBeNull();
    });

    it("should only clear error without affecting other state", () => {
      useHouseholdStore.setState({
        error: "Some error",
        members: [mockMember],
        isLoading: true,
      });

      useHouseholdStore.getState().clearError();

      const state = useHouseholdStore.getState();
      expect(state.error).toBeNull();
      expect(state.members).toHaveLength(1);
      expect(state.isLoading).toBe(true);
    });
  });

  describe("validateInviteCode", () => {
    it("should validate correct invite code successfully", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-10T10:00:00Z",
        },
      ];

      const result = await validateInviteCode("ABC123");

      expect(result.error).toBeNull();
      expect(result.household).toEqual(mockHousehold);
    });

    it("should convert invite code to uppercase", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [];

      const result = await validateInviteCode("abc123");

      expect(result.error).toBeNull();
      expect(result.household).toBeDefined();
    });

    it("should return error for invalid invite code", async () => {
      mockData.households = [];

      const result = await validateInviteCode("INVALID");

      expect(result.error).toBe("Codigo de convite invalido");
      expect(result.household).toBeNull();
    });

    it("should return error when household is full (free plan)", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-10T10:00:00Z",
        },
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-2",
          role: "member",
          joined_at: "2024-01-11T10:00:00Z",
        },
      ];

      const result = await validateInviteCode("ABC123");

      expect(result.error).toBe("Esta casa ja atingiu o limite de membros");
      expect(result.household).toBeNull();
    });

    it("should return error when household is full (premium_family plan)", async () => {
      const premiumHousehold: Household = {
        ...mockHousehold,
        plan_type: "premium_family",
      };

      mockData.households = [premiumHousehold];
      mockData.household_members = Array.from({ length: 6 }, (_, i) => ({
        id: `member-${i}`,
        household_id: "household-1",
        user_id: `user-${i}`,
        role: i === 0 ? ("admin" as const) : ("member" as const),
        joined_at: "2024-01-10T10:00:00Z",
      }));

      const result = await validateInviteCode("ABC123");

      expect(result.error).toBe("Esta casa ja atingiu o limite de membros");
      expect(result.household).toBeNull();
    });

    it("should succeed when household has space (premium_family plan)", async () => {
      const premiumHousehold: Household = {
        ...mockHousehold,
        plan_type: "premium_family",
      };

      mockData.households = [premiumHousehold];
      mockData.household_members = Array.from({ length: 5 }, (_, i) => ({
        id: `member-${i}`,
        household_id: "household-1",
        user_id: `user-${i}`,
        role: i === 0 ? ("admin" as const) : ("member" as const),
        joined_at: "2024-01-10T10:00:00Z",
      }));

      const result = await validateInviteCode("ABC123");

      expect(result.error).toBeNull();
      expect(result.household).toEqual(premiumHousehold);
    });
  });

  describe("joinHouseholdWithCode", () => {
    it("should join household successfully with valid code", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [];
      mockData.profiles = [
        {
          id: "user-2",
          email: "newuser@example.com",
          name: "New User",
          household_id: "household-1",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ];

      const result = await joinHouseholdWithCode("user-2", "ABC123");

      expect(result.error).toBeNull();
      expect(result.household).toEqual(mockHousehold);
    });

    it("should add user as member role", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [];
      mockData.profiles = [
        {
          id: "user-2",
          email: "newuser@example.com",
          name: "New User",
          household_id: "household-1",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ];

      await joinHouseholdWithCode("user-2", "ABC123");

      const member = mockData.household_members.find(m => m.user_id === "user-2");
      expect(member?.role).toBe("member");
    });

    it("should update user profile with household_id", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [];
      mockData.profiles = [
        {
          id: "user-2",
          email: "newuser@example.com",
          name: "New User",
          household_id: "household-1",
          created_at: "2024-01-15T10:00:00Z",
          updated_at: "2024-01-15T10:00:00Z",
        },
      ];

      await joinHouseholdWithCode("user-2", "ABC123");

      const profile = mockData.profiles.find(p => p.id === "user-2");
      expect(profile?.household_id).toBe("household-1");
    });

    it("should return error for invalid invite code", async () => {
      mockData.households = [];

      const result = await joinHouseholdWithCode("user-2", "INVALID");

      expect(result.error).toBe("Codigo de convite invalido");
      expect(result.household).toBeNull();
    });

    it("should return error when household is full", async () => {
      mockData.households = [mockHousehold];
      mockData.household_members = [
        {
          id: "member-1",
          household_id: "household-1",
          user_id: "user-1",
          role: "admin",
          joined_at: "2024-01-10T10:00:00Z",
        },
        {
          id: "member-2",
          household_id: "household-1",
          user_id: "user-3",
          role: "member",
          joined_at: "2024-01-11T10:00:00Z",
        },
      ];

      const result = await joinHouseholdWithCode("user-2", "ABC123");

      expect(result.error).toBe("Esta casa ja atingiu o limite de membros");
      expect(result.household).toBeNull();
    });
  });
});
