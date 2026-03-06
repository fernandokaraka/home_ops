import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "@/contexts/ThemeContext";

export interface AttachmentFile {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

interface AttachmentPickerProps {
  onAttachmentAdded: (file: AttachmentFile) => void;
  maxFiles?: number;
  currentFilesCount?: number;
  allowedTypes?: ("image" | "document")[];
  disabled?: boolean;
}

export function AttachmentPicker({
  onAttachmentAdded,
  maxFiles = 10,
  currentFilesCount = 0,
  allowedTypes = ["image", "document"],
  disabled = false,
}: AttachmentPickerProps) {
  const { theme } = useTheme();

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      return true;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "É necessário permitir o acesso à câmera para tirar fotos."
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    if (Platform.OS === "web") {
      return true;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permissão necessária",
        "É necessário permitir o acesso à galeria para selecionar fotos."
      );
      return false;
    }
    return true;
  };

  const handlePickFromCamera = async () => {
    if (currentFilesCount >= maxFiles) {
      Alert.alert(
        "Limite atingido",
        `Você pode adicionar no máximo ${maxFiles} arquivos.`
      );
      return;
    }

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onAttachmentAdded({
          uri: asset.uri,
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        });
      }
    } catch (error) {
      console.error("Error picking from camera:", error);
      Alert.alert("Erro", "Não foi possível tirar a foto.");
    }
  };

  const handlePickFromGallery = async () => {
    if (currentFilesCount >= maxFiles) {
      Alert.alert(
        "Limite atingido",
        `Você pode adicionar no máximo ${maxFiles} arquivos.`
      );
      return;
    }

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onAttachmentAdded({
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
        });
      }
    } catch (error) {
      console.error("Error picking from gallery:", error);
      Alert.alert("Erro", "Não foi possível selecionar a imagem.");
    }
  };

  const handlePickDocument = async () => {
    if (currentFilesCount >= maxFiles) {
      Alert.alert(
        "Limite atingido",
        `Você pode adicionar no máximo ${maxFiles} arquivos.`
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        onAttachmentAdded({
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || "application/pdf",
          size: asset.size,
        });
      }
    } catch (error) {
      console.error("Error picking document:", error);
      Alert.alert("Erro", "Não foi possível selecionar o documento.");
    }
  };

  const showOptions = () => {
    const options: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }[] = [];

    if (allowedTypes.includes("image")) {
      options.push(
        {
          label: "Tirar foto",
          icon: "camera",
          onPress: handlePickFromCamera,
        },
        {
          label: "Escolher da galeria",
          icon: "images",
          onPress: handlePickFromGallery,
        }
      );
    }

    if (allowedTypes.includes("document")) {
      options.push({
        label: "Selecionar documento",
        icon: "document",
        onPress: handlePickDocument,
      });
    }

    Alert.alert(
      "Adicionar anexo",
      "Escolha uma opção:",
      [
        ...options.map((opt) => ({
          text: opt.label,
          onPress: opt.onPress,
        })),
        {
          text: "Cancelar",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={showOptions}
        disabled={disabled}
        style={[
          styles.button,
          {
            backgroundColor: theme.surfaceVariant,
            borderColor: theme.border,
          },
          disabled && styles.disabled,
        ]}
        activeOpacity={0.7}
      >
        <Ionicons name="attach" size={20} color={theme.primary} />
        <Text style={[styles.buttonText, { color: theme.text }]}>
          Adicionar anexo
        </Text>
        <View style={styles.spacer} />
        <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
      </TouchableOpacity>
      {maxFiles > 0 && currentFilesCount > 0 && (
        <Text style={[styles.helperText, { color: theme.textMuted }]}>
          {currentFilesCount} de {maxFiles} arquivos
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  spacer: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
