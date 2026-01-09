import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card } from "@/components/ui";
import { StatusBadge } from "@/components/shared";
import {
  useMaintenanceStore,
  getDaysUntilMaintenance,
  getMaintenanceStatus,
} from "@/stores/maintenanceStore";
import { useTheme } from "@/contexts/ThemeContext";
import type { MaintenanceItem } from "@/types";

export default function MaintenanceDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, history, fetchHistory, deleteItem, isLoading } = useMaintenanceStore();
  const { theme } = useTheme();

  const [item, setItem] = useState<MaintenanceItem | null>(null);

  useEffect(() => {
    const found = items.find((i) => i.id === id);
    setItem(found || null);
    if (id) {
      fetchHistory(id);
    }
  }, [id, items]);

  const handleDelete = () => {
    Alert.alert(
      "Excluir item",
      "Tem certeza que deseja excluir este item? O historico de manutencoes tambem sera removido.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!item) return;
            const { error } = await deleteItem(item.id);
            if (error) {
              Alert.alert("Erro", error);
              return;
            }
            router.back();
          },
        },
      ]
    );
  };

  const handleCallProvider = () => {
    if (item?.provider_phone) {
      Linking.openURL(`tel:${item.provider_phone}`);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Nao informado";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "R$ 0,00";
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (!item) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </SafeAreaView>
    );
  }

  const status = getMaintenanceStatus(item.next_maintenance_date);
  const daysUntil = getDaysUntilMaintenance(item.next_maintenance_date);
  const categoryColor = item.category?.color || theme.gray[400];

  const getStatusLabel = () => {
    if (daysUntil === null) return { label: "Sem agendamento", variant: "neutral" as const };
    if (daysUntil < 0) return { label: "Atrasado", variant: "danger" as const };
    if (daysUntil <= 7) return { label: "Proximo", variant: "warning" as const };
    return { label: "Em dia", variant: "success" as const };
  };

  const statusInfo = getStatusLabel();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.gray[700]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detalhes</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/maintenance/edit?id=${id}`)}
            style={styles.headerButton}
          >
            <Ionicons name="pencil-outline" size={22} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.headerButton}
          >
            <Ionicons name="trash-outline" size={22} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Card */}
        <Card style={styles.mainCard}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={[styles.iconContainer, { backgroundColor: categoryColor + "20" }]}>
              <Ionicons
                name={(item.category?.icon || "construct-outline") as keyof typeof Ionicons.glyphMap}
                size={28}
                color={categoryColor}
              />
            </View>
            <View style={styles.cardHeaderContent}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              {(item.brand || item.model) && (
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  {[item.brand, item.model].filter(Boolean).join(" - ")}
                </Text>
              )}
              <View style={styles.badgeRow}>
                <StatusBadge label={statusInfo.label} variant={statusInfo.variant} />
                {item.warranty_until && new Date(item.warranty_until) > new Date() && (
                  <View style={styles.badgeMargin}>
                    <StatusBadge label="Garantia ativa" variant="info" />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Next Maintenance */}
          {item.next_maintenance_date && (
            <View style={[styles.nextMaintenanceBox, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={[styles.nextMaintenanceLabel, { color: theme.textSecondary }]}>Proxima manutencao</Text>
              <Text style={[styles.nextMaintenanceDate, { color: theme.text }]}>
                {formatDate(item.next_maintenance_date)}
              </Text>
              {daysUntil !== null && (
                <Text
                  style={[
                    styles.daysUntilText,
                    daysUntil < 0
                      ? { color: theme.danger }
                      : daysUntil <= 7
                      ? { color: theme.warning }
                      : { color: theme.success },
                  ]}
                >
                  {daysUntil < 0
                    ? `${Math.abs(daysUntil)} dias atrasado`
                    : daysUntil === 0
                    ? "Hoje"
                    : `Em ${daysUntil} dias`}
                </Text>
              )}
            </View>
          )}

          {/* Info Grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Intervalo</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {item.maintenance_interval_months
                  ? `${item.maintenance_interval_months} meses`
                  : "Nao definido"}
              </Text>
            </View>
            <View style={styles.infoItemRight}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Ultima manutencao</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {item.last_maintenance_date
                  ? formatDate(item.last_maintenance_date)
                  : "Nao registrada"}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Data de compra</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDate(item.purchase_date)}
              </Text>
            </View>
            <View style={styles.infoItemRight}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Garantia ate</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>
                {formatDate(item.warranty_until)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Provider Card */}
        {(item.preferred_provider || item.provider_phone) && (
          <Card style={styles.providerCard}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Fornecedor</Text>
            <View style={styles.providerRow}>
              <View>
                <Text style={[styles.providerName, { color: theme.text }]}>
                  {item.preferred_provider || "Nao informado"}
                </Text>
                {item.provider_phone && (
                  <Text style={[styles.providerPhone, { color: theme.textSecondary }]}>{item.provider_phone}</Text>
                )}
              </View>
              {item.provider_phone && (
                <TouchableOpacity
                  onPress={handleCallProvider}
                  style={[styles.callButton, { backgroundColor: theme.success }]}
                >
                  <Ionicons name="call" size={24} color={theme.surface} />
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}

        {/* History */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Historico de Manutencoes</Text>
            <Text style={[styles.historyCount, { color: theme.textSecondary }]}>
              {history.length} registro{history.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {history.length === 0 ? (
            <Card>
              <View style={styles.emptyHistory}>
                <Ionicons
                  name="document-text-outline"
                  size={40}
                  color={theme.gray[300]}
                />
                <Text style={[styles.emptyHistoryText, { color: theme.textMuted }]}>
                  Nenhuma manutencao registrada
                </Text>
              </View>
            </Card>
          ) : (
            history.map((h, index) => (
              <Card key={h.id} style={index < history.length - 1 ? styles.historyItemMargin : undefined}>
                <View style={styles.historyItem}>
                  <View style={styles.historyItemContent}>
                    <Text style={[styles.historyDate, { color: theme.text }]}>
                      {formatDate(h.maintenance_date)}
                    </Text>
                    {h.description && (
                      <Text style={[styles.historyDescription, { color: theme.gray[600] }]}>{h.description}</Text>
                    )}
                    {h.provider && (
                      <Text style={[styles.historyProvider, { color: theme.textSecondary }]}>
                        Por: {h.provider}
                      </Text>
                    )}
                  </View>
                  {h.cost && (
                    <Text style={[styles.historyCost, { color: theme.primary }]}>
                      {formatCurrency(h.cost)}
                    </Text>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Button
            onPress={() => router.push(`/maintenance/register?itemId=${item.id}`)}
            fullWidth
            size="lg"
            icon={<Ionicons name="checkmark-circle" size={20} color={theme.surface} />}
          >
            Registrar Manutencao
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  mainCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardHeaderContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  itemMeta: {
    marginTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  badgeMargin: {
    marginLeft: 8,
  },
  nextMaintenanceBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nextMaintenanceLabel: {
    fontSize: 14,
  },
  nextMaintenanceDate: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  daysUntilText: {
    fontSize: 14,
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    width: '50%',
    marginBottom: 16,
    paddingRight: 8,
  },
  infoItemRight: {
    width: '50%',
    marginBottom: 16,
    paddingLeft: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '500',
    marginTop: 4,
  },
  providerCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  providerName: {
    fontWeight: '500',
  },
  providerPhone: {
    marginTop: 4,
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyCount: {
    fontSize: 14,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyHistoryText: {
    marginTop: 12,
    textAlign: 'center',
  },
  historyItemMargin: {
    marginBottom: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  historyItemContent: {
    flex: 1,
  },
  historyDate: {
    fontWeight: '500',
  },
  historyDescription: {
    marginTop: 4,
  },
  historyProvider: {
    fontSize: 14,
    marginTop: 4,
  },
  historyCost: {
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
});
