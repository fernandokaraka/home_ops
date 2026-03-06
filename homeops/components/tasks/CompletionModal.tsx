import { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { Task } from "@/types";

interface CompletionModalProps {
  visible: boolean;
  task: Task | null;
  onClose: () => void;
  onComplete: (taskId: string, completedAt?: string) => void;
}

export function CompletionModal({
  visible,
  task,
  onClose,
  onComplete,
}: CompletionModalProps) {
  const { theme } = useTheme();
  const [mode, setMode] = useState<"now" | "custom">("now");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  if (!task) return null;

  const handleCompleteNow = () => {
    onComplete(task.id);
    handleClose();
  };

  const handleCompleteCustom = () => {
    // Combine date and time into a single ISO string
    const completedDateTime = new Date(selectedDate);
    completedDateTime.setHours(selectedTime.getHours());
    completedDateTime.setMinutes(selectedTime.getMinutes());
    completedDateTime.setSeconds(0);
    completedDateTime.setMilliseconds(0);

    // Validate date is not in the future
    const now = new Date();
    if (completedDateTime > now) {
      Alert.alert("Erro", "A data de conclusão não pode estar no futuro");
      return;
    }

    // Validate date is not more than 7 days in the past
    const minDate = getMinDate();
    if (completedDateTime < minDate) {
      Alert.alert("Erro", "A data de conclusão não pode ser mais de 7 dias no passado");
      return;
    }

    onComplete(task.id, completedDateTime.toISOString());
    handleClose();
  };

  const handleClose = () => {
    setMode("now");
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
    onClose();
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    setShowTimePicker(Platform.OS === "ios");
    if (time) {
      setSelectedTime(time);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getMinDate = () => {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 7);
    return minDate;
  };

  const getMaxDate = () => {
    return new Date();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Concluir Tarefa
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.taskTitle, { color: theme.textSecondary }]}>
            {task.title}
          </Text>

          {/* Mode Selection */}
          <View style={styles.modeContainer}>
            <TouchableOpacity
              onPress={() => setMode("now")}
              style={[
                styles.modeButton,
                { borderColor: theme.border },
                mode === "now" && {
                  borderColor: theme.primary,
                  backgroundColor: theme.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={mode === "now" ? theme.primary : theme.textMuted}
              />
              <View style={styles.modeTextContainer}>
                <Text
                  style={[
                    styles.modeLabel,
                    { color: theme.text },
                    mode === "now" && { color: theme.primary, fontWeight: "600" },
                  ]}
                >
                  Concluir Agora
                </Text>
                <Text
                  style={[
                    styles.modeDescription,
                    { color: theme.textMuted },
                    mode === "now" && { color: theme.primary },
                  ]}
                >
                  Registrar como concluído no momento atual
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("custom")}
              style={[
                styles.modeButton,
                { borderColor: theme.border },
                mode === "custom" && {
                  borderColor: theme.primary,
                  backgroundColor: theme.primaryLight,
                },
              ]}
            >
              <Ionicons
                name="calendar"
                size={24}
                color={mode === "custom" ? theme.primary : theme.textMuted}
              />
              <View style={styles.modeTextContainer}>
                <Text
                  style={[
                    styles.modeLabel,
                    { color: theme.text },
                    mode === "custom" && { color: theme.primary, fontWeight: "600" },
                  ]}
                >
                  Data Personalizada
                </Text>
                <Text
                  style={[
                    styles.modeDescription,
                    { color: theme.textMuted },
                    mode === "custom" && { color: theme.primary },
                  ]}
                >
                  Escolher data e hora específicas
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Custom Date/Time Selection */}
          {mode === "custom" && (
            <View style={styles.customContainer}>
              {/* Date Picker Button */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.dateTimeButton,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={theme.primary}
                />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={[styles.dateTimeLabel, { color: theme.textMuted }]}>
                    Data
                  </Text>
                  <Text style={[styles.dateTimeValue, { color: theme.text }]}>
                    {formatDate(selectedDate)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {/* Time Picker Button */}
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={[
                  styles.dateTimeButton,
                  { backgroundColor: theme.surfaceVariant },
                ]}
              >
                <Ionicons name="time-outline" size={20} color={theme.primary} />
                <View style={styles.dateTimeTextContainer}>
                  <Text style={[styles.dateTimeLabel, { color: theme.textMuted }]}>
                    Horário
                  </Text>
                  <Text style={[styles.dateTimeValue, { color: theme.text }]}>
                    {formatTime(selectedTime)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textMuted}
                />
              </TouchableOpacity>

              {/* Info Text */}
              <View
                style={[
                  styles.infoBox,
                  { backgroundColor: theme.primaryLight + "40" },
                ]}
              >
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={theme.primary}
                />
                <Text style={[styles.infoText, { color: theme.primary }]}>
                  Você pode registrar conclusões de até 7 dias atrás
                </Text>
              </View>

              {/* Date Picker for Android/iOS */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleDateChange}
                  minimumDate={getMinDate()}
                  maximumDate={getMaxDate()}
                  locale="pt-BR"
                />
              )}

              {/* Time Picker for Android/iOS */}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                  locale="pt-BR"
                />
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.modalButton,
                { backgroundColor: theme.surfaceVariant },
              ]}
            >
              <Text
                style={[styles.modalButtonText, { color: theme.textSecondary }]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={mode === "now" ? handleCompleteNow : handleCompleteCustom}
              style={[styles.modalButton, { backgroundColor: theme.success }]}
            >
              <Ionicons name="checkmark" size={20} color={theme.surface} />
              <Text
                style={[styles.modalButtonText, { color: theme.surface }]}
              >
                Concluir
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 16,
    padding: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 4,
  },
  taskTitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  modeContainer: {
    gap: 12,
    marginBottom: 20,
  },
  modeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  modeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  modeDescription: {
    fontSize: 13,
  },
  customContainer: {
    gap: 12,
    marginBottom: 20,
  },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  dateTimeTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  dateTimeLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  dateTimeValue: {
    fontSize: 16,
    fontWeight: "500",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
