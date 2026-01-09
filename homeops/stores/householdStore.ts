import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { HouseholdMember, Household, PlanType } from "@/types";
import { PLAN_LIMITS } from "@/types";

interface HouseholdState {
  members: HouseholdMember[];
  isLoading: boolean;
  error: string | null;
}

interface HouseholdActions {
  fetchMembers: (householdId: string) => Promise<void>;
  removeMember: (memberId: string, householdId: string) => Promise<{ error: string | null }>;
  leaveHousehold: (userId: string, householdId: string) => Promise<{ error: string | null }>;
  getMemberLimit: (planType: PlanType) => number;
  canAddMember: (householdId: string, planType: PlanType) => boolean;
  clearError: () => void;
}

// Validate invite code and get household
export async function validateInviteCode(inviteCode: string): Promise<{ household: Household | null; error: string | null }> {
  const { data: household, error } = await supabase
    .from("households")
    .select("*")
    .eq("invite_code", inviteCode.toUpperCase())
    .single();

  if (error || !household) {
    return { household: null, error: "Codigo de convite invalido" };
  }

  // Check if household has space for new members
  const { count } = await supabase
    .from("household_members")
    .select("*", { count: "exact", head: true })
    .eq("household_id", household.id);

  const planType = (household.plan_type || "free") as PlanType;
  const limit = PLAN_LIMITS[planType];

  if (count !== null && count >= limit) {
    return { household: null, error: "Esta casa ja atingiu o limite de membros" };
  }

  return { household, error: null };
}

// Join household with invite code (used during registration)
export async function joinHouseholdWithCode(
  userId: string,
  inviteCode: string
): Promise<{ household: Household | null; error: string | null }> {
  const { household, error: validateError } = await validateInviteCode(inviteCode);

  if (validateError || !household) {
    return { household: null, error: validateError };
  }

  // Add user as member
  const { error: memberError } = await supabase
    .from("household_members")
    .insert({
      household_id: household.id,
      user_id: userId,
      role: "member",
    });

  if (memberError) {
    console.error("Error adding member:", memberError);
    return { household: null, error: "Erro ao entrar na casa" };
  }

  // Update user's household_id in profile
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ household_id: household.id })
    .eq("id", userId);

  if (profileError) {
    console.error("Error updating profile:", profileError);
    return { household: null, error: "Erro ao atualizar perfil" };
  }

  return { household, error: null };
}

export const useHouseholdStore = create<HouseholdState & HouseholdActions>((set, get) => ({
  members: [],
  isLoading: false,
  error: null,

  fetchMembers: async (householdId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase
        .from("household_members")
        .select(`
          *,
          user:profiles(id, name, email, avatar_url)
        `)
        .eq("household_id", householdId)
        .order("joined_at", { ascending: true });

      if (error) {
        set({ error: "Erro ao carregar membros", isLoading: false });
        return;
      }

      // Transform data to match HouseholdMember interface
      const members: HouseholdMember[] = (data || []).map((m: any) => ({
        id: m.id,
        household_id: m.household_id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        user: m.user,
      }));

      set({ members, isLoading: false });
    } catch (err) {
      set({ error: "Erro ao carregar membros", isLoading: false });
    }
  },

  removeMember: async (memberId: string, householdId: string) => {
    set({ isLoading: true, error: null });

    try {
      // Get the member to find their user_id
      const { data: member } = await supabase
        .from("household_members")
        .select("user_id")
        .eq("id", memberId)
        .single();

      if (!member) {
        set({ isLoading: false, error: "Membro nao encontrado" });
        return { error: "Membro nao encontrado" };
      }

      // Remove from household_members
      const { error: deleteError } = await supabase
        .from("household_members")
        .delete()
        .eq("id", memberId);

      if (deleteError) {
        set({ isLoading: false, error: "Erro ao remover membro" });
        return { error: "Erro ao remover membro" };
      }

      // Clear household_id from profile
      await supabase
        .from("profiles")
        .update({ household_id: null })
        .eq("id", member.user_id);

      // Refresh members list
      await get().fetchMembers(householdId);

      return { error: null };
    } catch (err) {
      set({ isLoading: false, error: "Erro ao remover membro" });
      return { error: "Erro ao remover membro" };
    }
  },

  leaveHousehold: async (userId: string, householdId: string) => {
    set({ isLoading: true, error: null });

    try {
      // Check if user is admin and sole admin
      const { data: members } = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", householdId);

      const userMember = members?.find((m: any) => m.user_id === userId);
      const adminCount = members?.filter((m: any) => m.role === "admin").length || 0;

      if (userMember?.role === "admin" && adminCount <= 1 && (members?.length || 0) > 1) {
        set({ isLoading: false, error: "Voce precisa promover outro membro a admin antes de sair" });
        return { error: "Voce precisa promover outro membro a admin antes de sair" };
      }

      // Remove from household_members
      const { error: deleteError } = await supabase
        .from("household_members")
        .delete()
        .eq("user_id", userId)
        .eq("household_id", householdId);

      if (deleteError) {
        set({ isLoading: false, error: "Erro ao sair da casa" });
        return { error: "Erro ao sair da casa" };
      }

      // Clear household_id from profile
      await supabase
        .from("profiles")
        .update({ household_id: null })
        .eq("id", userId);

      set({ members: [], isLoading: false });
      return { error: null };
    } catch (err) {
      set({ isLoading: false, error: "Erro ao sair da casa" });
      return { error: "Erro ao sair da casa" };
    }
  },

  getMemberLimit: (planType: PlanType) => {
    return PLAN_LIMITS[planType];
  },

  canAddMember: (householdId: string, planType: PlanType) => {
    const { members } = get();
    const limit = PLAN_LIMITS[planType];
    return members.length < limit;
  },

  clearError: () => set({ error: null }),
}));
