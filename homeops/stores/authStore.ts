import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User, Household } from "@/types";
import type { Session, AuthError } from "@supabase/supabase-js";
import { validateInviteCode } from "./householdStore";

// Tradução de erros do Supabase
function translateAuthError(error: AuthError | null): string {
  if (!error) return "";

  const errorMap: Record<string, string> = {
    "Invalid login credentials": "Email ou senha incorretos",
    "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada.",
    "User already registered": "Este email já está cadastrado",
    "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres",
    "Unable to validate email address: invalid format": "Formato de email inválido",
    "Signup requires a valid password": "Senha inválida",
    "User not found": "Usuário não encontrado",
    "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos.",
    "For security purposes, you can only request this once every 60 seconds": "Por segurança, aguarde 60 segundos para tentar novamente",
    "New password should be different from the old password": "A nova senha deve ser diferente da atual",
  };

  // Check for partial matches
  for (const [key, value] of Object.entries(errorMap)) {
    if (error.message.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  // Return original message if no translation found
  return error.message;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  household: Household | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, name: string, inviteCode?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  user: null,
  session: null,
  household: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        let household = null;
        if (profile?.household_id) {
          const { data } = await supabase
            .from("households")
            .select("*")
            .eq("id", profile.household_id)
            .single();
          household = data;
        }

        set({
          session,
          user: profile,
          household,
          isInitialized: true,
          isLoading: false,
        });
      } else {
        set({ isInitialized: true, isLoading: false });
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          let household = null;
          if (profile?.household_id) {
            const { data } = await supabase
              .from("households")
              .select("*")
              .eq("id", profile.household_id)
              .single();
            household = data;
          }

          set({ session, user: profile, household });
        } else if (event === "SIGNED_OUT") {
          set({ session: null, user: null, household: null });
        }
      });
    } catch (error) {
      set({ isInitialized: true, isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false, error: translateAuthError(error) });
      return { error };
    }

    if (data.session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.session.user.id)
        .single();

      let household = null;
      if (profile?.household_id) {
        const { data: h } = await supabase
          .from("households")
          .select("*")
          .eq("id", profile.household_id)
          .single();
        household = h;
      }

      set({
        session: data.session,
        user: profile,
        household,
        isLoading: false,
      });
    }

    return { error: null };
  },

  signUp: async (email: string, password: string, name: string, inviteCode?: string) => {
    set({ isLoading: true, error: null });

    // If invite code provided, validate it first
    let existingHousehold: Household | null = null;
    if (inviteCode && inviteCode.trim()) {
      const { household, error: validateError } = await validateInviteCode(inviteCode.trim());
      if (validateError) {
        set({ isLoading: false, error: validateError });
        return { error: { message: validateError } as AuthError };
      }
      existingHousehold = household;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });

    if (error) {
      set({ isLoading: false, error: translateAuthError(error) });
      return { error };
    }

    // Create household and profile
    if (data.user) {
      console.log("User created:", data.user.id);

      let household: Household | null = null;

      if (existingHousehold) {
        // Join existing household
        household = existingHousehold;
        console.log("Joining existing household:", household.id);

        // Create profile linked to existing household
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          name,
          household_id: household.id,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          set({ isLoading: false, error: "Erro ao criar perfil: " + profileError.message });
          return { error: profileError as unknown as AuthError };
        }

        // Add as member of household
        const { error: memberError } = await supabase.from("household_members").insert({
          household_id: household.id,
          user_id: data.user.id,
          role: "member",
        });

        if (memberError) {
          console.error("Error adding member:", memberError);
          // Non-fatal, continue
        }

        console.log("Profile created and joined household");
      } else {
        // Create new household
        const { data: newHousehold, error: householdError } = await supabase
          .from("households")
          .insert({ name: "Minha Casa", created_by: data.user.id })
          .select()
          .single();

        if (householdError) {
          console.error("Error creating household:", householdError);
          set({ isLoading: false, error: "Erro ao criar casa: " + householdError.message });
          return { error: householdError as unknown as AuthError };
        }

        household = newHousehold;
        console.log("Household created:", household?.id);

        // Create profile
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          email,
          name,
          household_id: household.id,
        });

        if (profileError) {
          console.error("Error creating profile:", profileError);
          set({ isLoading: false, error: "Erro ao criar perfil: " + profileError.message });
          return { error: profileError as unknown as AuthError };
        }

        // Add as admin member of new household
        const { error: memberError } = await supabase.from("household_members").insert({
          household_id: household.id,
          user_id: data.user.id,
          role: "admin",
        });

        if (memberError) {
          console.error("Error adding member:", memberError);
          // Non-fatal, continue
        }

        console.log("Profile created");
      }

      // Fetch created profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single();

      set({
        session: data.session,
        user: profile,
        household,
        isLoading: false,
      });
    }

    return { error: null };
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({
      user: null,
      session: null,
      household: null,
      isLoading: false,
    });
  },

  clearError: () => set({ error: null }),
}));
