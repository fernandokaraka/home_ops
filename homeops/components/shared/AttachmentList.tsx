import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { Attachment } from "@/types";

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (id: string) => void;
  onView?: (attachment: Attachment) => void;
  editable?: boolean;
}

export function AttachmentList({
  attachments,
  onDelete,
  onView,
  editable = false,
}: AttachmentListProps) {
  const { theme } = useTheme();

  const isImage = (fileType: string) => {
    return fileType.startsWith("image/");
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";

    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (id: string, fileName: string) => {
    if (!onDelete) return;

    Alert.alert(
      "Excluir anexo",
      `Deseja realmente excluir "${fileName}"?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => onDelete(id),
        },
      ]
    );
  };

  const renderAttachment = ({ item }: { item: Attachment }) => {
    const isImageFile = isImage(item.file_type);

    return (
      <TouchableOpacity
        onPress={() => onView?.(item)}
        activeOpacity={0.7}
        style={[
          styles.attachmentItem,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {/* Thumbnail or Icon */}
        <View style={[styles.thumbnailContainer, { backgroundColor: theme.surfaceVariant }]}>
          {isImageFile ? (
            <Image
              source={{ uri: item.file_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <Ionicons
              name="document-text"
              size={32}
              color={theme.primary}
            />
          )}
        </View>

        {/* File Info */}
        <View style={styles.fileInfo}>
          <Text
            style={[styles.fileName, { color: theme.text }]}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {item.file_name}
          </Text>
          <View style={styles.metaRow}>
            {item.file_size && (
              <Text style={[styles.fileSize, { color: theme.textMuted }]}>
                {formatFileSize(item.file_size)}
              </Text>
            )}
            {item.description && (
              <>
                <Text style={[styles.metaSeparator, { color: theme.textMuted }]}>•</Text>
                <Text
                  style={[styles.description, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {item.description}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Actions */}
        {editable && onDelete && (
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.file_name)}
            style={styles.deleteButton}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="trash-outline" size={20} color={theme.danger} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>
        Anexos ({attachments.length})
      </Text>
      <FlatList
        data={attachments}
        keyExtractor={(item) => item.id}
        renderItem={renderAttachment}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  fileSize: {
    fontSize: 12,
  },
  metaSeparator: {
    marginHorizontal: 6,
    fontSize: 12,
  },
  description: {
    fontSize: 12,
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
});
