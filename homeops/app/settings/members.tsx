import { useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Share, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuthStore } from "@/stores/authStore";
import { useHouseholdStore } from "@/stores/householdStore";
import { PLAN_LIMITS, PLAN_NAMES, PlanType } from "@/types";

interface MemberItemProps {
  name: string;
  email: string;
  role: "admin" | "member";
  isCurrentUser: boolean;
  onRemove?: () => void;
  canRemove: boolean;
}

function MemberItem({ name, email, role, isCurrentUser, onRemove, canRemove }: MemberItemProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.memberItem, { borderBottomColor: theme.surfaceVariant }]}>
      <View style={[styles.memberAvatar, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.memberInitial, { color: theme.primary }]}>
          {name?.charAt(0).toUpperCase() || "U"}
        </Text>
      </View>

      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={[styles.memberName, { color: theme.text }]}>{name}</Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: theme.primary + '20' }]}>
              <Text style={[styles.youBadgeText, { color: theme.primary }]}>Voce</Text>
            </View>
          )}
        </View>
        <Text style={[styles.memberEmail, { color: theme.textSecondary }]}>{email}</Text>
        <View style={styles.roleRow}>
          <View style={[
            styles.roleBadge,
            { backgroundColor: role === 'admin' ? theme.warning + '20' : theme.surfaceVariant }
          ]}>
            <Ionicons
              name={role === 'admin' ? 'shield-checkmark' : 'person'}
              size={12}
              color={role === 'admin' ? theme.warning : theme.textSecondary}
            />
            <Text style={[
              styles.roleText,
              { color: role === 'admin' ? theme.warning : theme.textSecondary }
            ]}>
              {role === 'admin' ? 'Administrador' : 'Membro'}
            </Text>
          </View>
        </View>
      </View>

      {canRemove && !isCurrentUser && (
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="close-circle" size={24} color={theme.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MembersScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const { user, household } = useAuthStore();
  const { members, isLoading, fetchMembers, removeMember } = useHouseholdStore();

  const planType = (household?.plan_type || 'free') as PlanType;
  const memberLimit = PLAN_LIMITS[planType];
  const planName = PLAN_NAMES[planType];

  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';

  const loadMembers = useCallback(async () => {
    if (household?.id) {
      await fetchMembers(household.id);
    }
  }, [household?.id, fetchMembers]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleInvite = async () => {
    if (!household?.invite_code) return;

    try {
      await Share.share({
        message: `Junte-se a minha casa no HomeOps!\n\nUse o codigo de convite: ${household.invite_code}\n\nBaixe o app e insira o codigo no cadastro.`,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    Alert.alert(
      "Remover membro",
      `Tem certeza que deseja remover ${memberName} da casa?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            if (household?.id) {
              const { error } = await removeMember(memberId, household.id);
              if (error) {
                Alert.alert("Erro", error);
              }
            }
          },
        },
      ]
    );
  };

  const canAddMore = members.length < memberLimit;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.surfaceVariant }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Membros</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadMembers}
            tintColor={theme.primary}
          />
        }
      >
        {/* Household Info */}
        <View style={styles.section}>
          <Card>
            <View style={styles.householdRow}>
              <View style={[styles.householdIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="home" size={24} color={theme.surface} />
              </View>
              <View style={styles.householdInfo}>
                <Text style={[styles.householdName, { color: theme.text }]}>
                  {household?.name || "Minha Casa"}
                </Text>
                <Text style={[styles.householdPlan, { color: theme.textSecondary }]}>
                  Plano {planName}
                </Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.surfaceVariant }]} />

            <View style={styles.codeRow}>
              <View>
                <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>Codigo de convite</Text>
                <Text style={[styles.codeValue, { color: theme.text }]}>
                  {household?.invite_code || "---"}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleInvite}
                style={[styles.shareButton, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="share-outline" size={20} color={theme.surface} />
                <Text style={[styles.shareButtonText, { color: theme.surface }]}>Convidar</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Member Count */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>MEMBROS</Text>
            <View style={[
              styles.countBadge,
              { backgroundColor: canAddMore ? theme.success + '20' : theme.danger + '20' }
            ]}>
              <Text style={[
                styles.countText,
                { color: canAddMore ? theme.success : theme.danger }
              ]}>
                {members.length}/{memberLimit}
              </Text>
            </View>
          </View>

          <Card>
            {members.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={40} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                  Nenhum membro encontrado
                </Text>
              </View>
            ) : (
              members.map((member, index) => (
                <MemberItem
                  key={member.id}
                  name={member.user?.name || "Usuario"}
                  email={member.user?.email || ""}
                  role={member.role}
                  isCurrentUser={member.user_id === user?.id}
                  canRemove={isAdmin}
                  onRemove={() => handleRemoveMember(member.id, member.user?.name || "Usuario")}
                />
              ))
            )}
          </Card>
        </View>

        {/* Info */}
        {!canAddMore && (
          <View style={styles.section}>
            <Card style={{ backgroundColor: theme.danger + '15' }}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={theme.danger} />
                <Text style={[styles.infoText, { color: theme.danger }]}>
                  Sua casa atingiu o limite de {memberLimit} membros do plano {planName}. Para adicionar mais membros, faca upgrade do plano.
                </Text>
              </View>
            </Card>
          </View>
        )}

        <View style={styles.section}>
          <Card>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Compartilhe o codigo de convite para adicionar novos membros. Novos usuarios podem inserir o codigo ao criar uma conta no app.
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  householdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  householdIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  householdInfo: {
    marginLeft: 16,
    flex: 1,
  },
  householdName: {
    fontWeight: '600',
    fontSize: 16,
  },
  householdPlan: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeLabel: {
    fontSize: 12,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 4,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  shareButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontWeight: '600',
    fontSize: 16,
  },
  youBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    marginLeft: 4,
  },
  removeButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});
