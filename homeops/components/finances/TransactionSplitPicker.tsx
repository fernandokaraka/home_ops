import { View, Text, TouchableOpacity, StyleSheet, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { User, TransactionSplit } from "@/types";

interface TransactionSplitPickerProps {
  members: User[];
  totalAmount: number;
  initialPaidBy?: string | null;
  initialSplits?: TransactionSplit[];
  onSplitChange: (paidBy: string | null, splits: Omit<TransactionSplit, 'id' | 'transaction_id' | 'created_at'>[]) => void;
}

// Helper function to safely get member initial
const getInitial = (name: string) => {
  if (!name || name.trim() === "") return "?";
  return name.charAt(0).toUpperCase();
};

export function TransactionSplitPicker({
  members,
  totalAmount,
  initialPaidBy,
  initialSplits = [],
  onSplitChange,
}: TransactionSplitPickerProps) {
  const { theme } = useTheme();

  // Who paid for this transaction
  const [paidBy, setPaidBy] = useState<string | null>(initialPaidBy || null);

  // Split mode: equal or custom
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');

  // Selected members to split the cost
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  // Custom amounts for each member (when splitMode is 'custom')
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Initialize from initialSplits
  useEffect(() => {
    if (initialSplits.length > 0) {
      const memberIds = new Set(initialSplits.map(s => s.member_id));
      setSelectedMembers(memberIds);

      // Check if it's equal split
      const amounts = initialSplits.map(s => s.share_amount);
      const isEqual = amounts.every(a => Math.abs(a - amounts[0]) < 0.01);

      if (isEqual) {
        setSplitMode('equal');
      } else {
        setSplitMode('custom');
        const custom: Record<string, string> = {};
        initialSplits.forEach(split => {
          custom[split.member_id] = split.share_amount.toFixed(2);
        });
        setCustomAmounts(custom);
      }
    }
  }, [initialSplits]);

  // Calculate and notify parent of changes
  useEffect(() => {
    if (selectedMembers.size === 0) {
      onSplitChange(paidBy, []);
      return;
    }

    const splits: Omit<TransactionSplit, 'id' | 'transaction_id' | 'created_at'>[] = [];

    if (splitMode === 'equal') {
      const shareAmount = totalAmount / selectedMembers.size;
      selectedMembers.forEach(memberId => {
        splits.push({
          member_id: memberId,
          share_amount: shareAmount,
        });
      });
    } else {
      // Custom mode
      selectedMembers.forEach(memberId => {
        const amountStr = customAmounts[memberId] || '0';
        const amount = parseFloat(amountStr.replace(',', '.')) || 0;
        splits.push({
          member_id: memberId,
          share_amount: amount,
        });
      });
    }

    onSplitChange(paidBy, splits);
  }, [paidBy, selectedMembers, splitMode, customAmounts, totalAmount, onSplitChange]);

  const handlePaidBySelect = (memberId: string) => {
    setPaidBy(paidBy === memberId ? null : memberId);
  };

  const handleMemberToggle = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
      // Remove custom amount if exists
      const newCustom = { ...customAmounts };
      delete newCustom[memberId];
      setCustomAmounts(newCustom);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleCustomAmountChange = (memberId: string, value: string) => {
    setCustomAmounts(prev => ({
      ...prev,
      [memberId]: value,
    }));
  };

  const calculateTotalSplit = () => {
    if (splitMode === 'equal') {
      return totalAmount;
    }

    let total = 0;
    selectedMembers.forEach(memberId => {
      const amountStr = customAmounts[memberId] || '0';
      total += parseFloat(amountStr.replace(',', '.')) || 0;
    });
    return total;
  };

  const totalSplit = calculateTotalSplit();
  const hasDiscrepancy = Math.abs(totalSplit - totalAmount) > 0.01 && selectedMembers.size > 0;

  return (
    <View style={styles.container}>
      {/* Who Paid Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quem pagou?</Text>
        <View style={styles.membersList}>
          {members.map(member => {
            const isSelected = paidBy === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                onPress={() => handlePaidBySelect(member.id)}
                style={[
                  styles.memberButton,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  isSelected && { backgroundColor: theme.primaryLight, borderColor: theme.primary }
                ]}
              >
                <View style={styles.memberInfo}>
                  <View style={[
                    styles.avatar,
                    { backgroundColor: isSelected ? theme.primary : theme.surfaceVariant }
                  ]}>
                    <Text style={[styles.avatarText, { color: isSelected ? theme.surface : theme.text }]}>
                      {getInitial(member.name)}
                    </Text>
                  </View>
                  <Text style={[styles.memberName, { color: isSelected ? theme.primary : theme.text }]}>
                    {member.name}
                  </Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Split Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Dividir entre</Text>
          <View style={[styles.modeSwitcher, { backgroundColor: theme.surfaceVariant }]}>
            <TouchableOpacity
              onPress={() => setSplitMode('equal')}
              style={[
                styles.modeButton,
                splitMode === 'equal' && { backgroundColor: theme.surface }
              ]}
            >
              <Text style={[
                styles.modeButtonText,
                { color: theme.textSecondary },
                splitMode === 'equal' && { color: theme.primary, fontWeight: '600' }
              ]}>
                Igual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSplitMode('custom')}
              style={[
                styles.modeButton,
                splitMode === 'custom' && { backgroundColor: theme.surface }
              ]}
            >
              <Text style={[
                styles.modeButtonText,
                { color: theme.textSecondary },
                splitMode === 'custom' && { color: theme.primary, fontWeight: '600' }
              ]}>
                Personalizado
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.membersList}>
          {members.map(member => {
            const isSelected = selectedMembers.has(member.id);
            const shareAmount = splitMode === 'equal' && selectedMembers.size > 0
              ? totalAmount / selectedMembers.size
              : parseFloat((customAmounts[member.id] || '0').replace(',', '.')) || 0;

            return (
              <View key={member.id}>
                <TouchableOpacity
                  onPress={() => handleMemberToggle(member.id)}
                  style={[
                    styles.memberButton,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    isSelected && { backgroundColor: theme.successLight, borderColor: theme.success }
                  ]}
                >
                  <View style={styles.memberInfo}>
                    <View style={[
                      styles.checkbox,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: theme.success, borderColor: theme.success }
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={16} color={theme.surface} />
                      )}
                    </View>
                    <Text style={[styles.memberName, { color: theme.text }]}>
                      {member.name}
                    </Text>
                  </View>
                  {isSelected && splitMode === 'equal' && (
                    <Text style={[styles.shareAmount, { color: theme.success }]}>
                      R$ {shareAmount.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Custom amount input */}
                {isSelected && splitMode === 'custom' && (
                  <View style={[styles.customAmountInput, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.currencySymbol, { color: theme.textMuted }]}>R$</Text>
                    <TextInput
                      style={[styles.input, { color: theme.text }]}
                      placeholder="0,00"
                      placeholderTextColor={theme.textMuted}
                      value={customAmounts[member.id] || ''}
                      onChangeText={(value) => handleCustomAmountChange(member.id, value)}
                      keyboardType="numeric"
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Split summary */}
        {selectedMembers.size > 0 && (
          <View style={[
            styles.summary,
            { backgroundColor: hasDiscrepancy ? theme.dangerLight : theme.successLight }
          ]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Total a dividir:</Text>
              <Text style={[styles.summaryValue, { color: theme.text }]}>R$ {totalSplit.toFixed(2)}</Text>
            </View>
            {hasDiscrepancy && (
              <View style={styles.warningRow}>
                <Ionicons name="alert-circle" size={16} color={theme.danger} />
                <Text style={[styles.warningText, { color: theme.danger }]}>
                  Diferença de R$ {Math.abs(totalSplit - totalAmount).toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modeButtonText: {
    fontSize: 12,
  },
  membersList: {
    gap: 8,
  },
  memberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
  },
  shareAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  customAmountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  currencySymbol: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  summary: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
});
