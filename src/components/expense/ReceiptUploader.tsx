import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Camera, FileCheck2, FileUp, Image as ImageIcon, Receipt, Trash2 } from "lucide-react-native";
import { ReactNode } from "react";
import { Alert, Image, Text, View } from "react-native";
import { useElevation, useThemeColors } from "../../hooks/useTheme";
import { LocalReceipt } from "../../services/upload.service";
import { requestCamera, requestMedia } from "../../utils/permissions";
import { validateReceipt } from "../../utils/validators";
import { MotionPressable, MotionView } from "../shared/Motion";

type Props = { value?: LocalReceipt; onChange: (file?: LocalReceipt) => void };

export const ReceiptUploader = ({ value, onChange }: Props) => {
  const c = useThemeColors();
  const shadow = useElevation("soft");
  const fileSizeLabel = value?.size ? `${Math.max(0.1, value.size / (1024 * 1024)).toFixed(1)} MB` : "Ready";

  const acceptFile = (file: LocalReceipt) => {
    const message = validateReceipt(file);
    if (message) { onChange(undefined); Alert.alert("Unsupported receipt", message); return; }
    onChange(file);
  };

  const camera = async () => {
    if (!(await requestCamera())) return;
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: false });
    if (!result.canceled) {
      Haptics.selectionAsync();
      const a = result.assets[0];
      acceptFile({ uri: a.uri, name: a.fileName || "receipt.jpg", mimeType: a.mimeType || "image/jpeg", size: a.fileSize });
    }
  };

  const gallery = async () => {
    if (!(await requestMedia())) return;
    const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, mediaTypes: ["images"] });
    if (!result.canceled) {
      Haptics.selectionAsync();
      const a = result.assets[0];
      acceptFile({ uri: a.uri, name: a.fileName || "receipt.jpg", mimeType: a.mimeType || "image/jpeg", size: a.fileSize });
    }
  };

  const file = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
    if (!result.canceled) {
      const a = result.assets[0];
      Haptics.selectionAsync();
      acceptFile({ uri: a.uri, name: a.name, mimeType: a.mimeType || "application/octet-stream", size: a.size });
    }
  };

  return (
    <MotionView direction="up" style={[{ marginBottom: 20, borderRadius: 18, borderCurve: "continuous", borderWidth: 1, borderColor: value ? c.success : c.glassBorder, backgroundColor: c.surfaceGlass, padding: 18 }, shadow]}>
      <View style={{ marginBottom: 14, flexDirection: "row", alignItems: "center" }}>
        <View style={{ marginRight: 12, width: 44, height: 44, borderRadius: 14, backgroundColor: value ? c.successSoft : c.primarySoft, alignItems: "center", justifyContent: "center" }}>
          {value ? <FileCheck2 color={c.success} size={21} /> : <Receipt color={c.primary} size={21} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>Receipt</Text>
            <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: value ? c.successSoft : c.surfaceMuted }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: value ? c.success : c.muted }}>{value ? "Attached" : "Optional"}</Text>
            </View>
          </View>
          <Text style={{ marginTop: 3, fontSize: 13, lineHeight: 17, fontWeight: "500", color: c.muted }}>JPG, PNG, WebP, or PDF up to 10 MB.</Text>
        </View>
      </View>
      {value ? (
        <MotionView direction="scale">
          {value.mimeType.startsWith("image/") ? <Image source={{ uri: value.uri }} style={{ height: 180, width: "100%", borderRadius: 14, backgroundColor: c.surfaceMuted }} /> : null}
          <View style={{ marginTop: 10, flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: c.surfaceStrong, padding: 10 }}>
            <View style={{ marginRight: 10, width: 38, height: 38, borderRadius: 12, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center" }}>
              <FileCheck2 size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.text }} numberOfLines={1}>{value.name}</Text>
              <Text style={{ marginTop: 2, fontSize: 12, fontWeight: "500", color: c.muted }} numberOfLines={1}>{fileSizeLabel} · included with submission</Text>
            </View>
            <MotionPressable onPress={() => onChange(undefined)} haptic style={{ marginLeft: 10, width: 44, height: 44, borderRadius: 13, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center" }} accessibilityRole="button" accessibilityLabel="Remove receipt">
              <Trash2 size={17} color={c.error} />
            </MotionPressable>
          </View>
        </MotionView>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <UploadAction icon={<Camera size={22} color={c.primary} strokeWidth={1.9} />} label="Camera" onPress={camera} c={c} />
          <UploadAction icon={<ImageIcon size={22} color={c.primary} strokeWidth={1.9} />} label="Gallery" onPress={gallery} c={c} />
          <UploadAction icon={<FileUp size={22} color={c.primary} strokeWidth={1.9} />} label="File" onPress={file} c={c} />
        </View>
      )}
    </MotionView>
  );
};

const UploadAction = ({ icon, label, onPress, c }: { icon: ReactNode; label: string; onPress: () => void; c: ReturnType<typeof useThemeColors> }) => (
  <MotionPressable onPress={onPress} haptic pressScale={0.94} style={{ flex: 1, minHeight: 84, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: 14, borderCurve: "continuous", borderWidth: 1, borderStyle: "dashed", borderColor: c.borderStrong, backgroundColor: c.surfaceStrong }} accessibilityRole="button" accessibilityLabel={`Upload receipt from ${label}`}>
    {icon}
    <Text style={{ marginTop: 7, fontSize: 13, fontWeight: "700", color: c.primary }}>{label}</Text>
  </MotionPressable>
);
