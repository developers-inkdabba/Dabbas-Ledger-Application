import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import { useAuthStore } from "../store/auth.store";
import { UploadResult } from "../types";
import { maxReceiptBytes, validateReceipt } from "../utils/validators";

export type LocalReceipt = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  resource_type?: string;
  error?: {
    message?: string;
  };
};

const getCloudinaryConfig = () => {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) {
    throw new Error("Missing Cloudinary config. Add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET to mobile/.env.");
  }
  return { cloudName, uploadPreset };
};

export const uploadService = {
  validateLocalFile: async (receipt: LocalReceipt) => {
    const info = await FileSystem.getInfoAsync(receipt.uri);
    const size = receipt.size || (info.exists ? info.size : undefined);
    const message = validateReceipt({ mimeType: receipt.mimeType, size });
    if (message) throw new Error(message);
    if (!info.exists) throw new Error("Receipt file could not be found. Please attach it again.");
    if ((size || 0) > maxReceiptBytes) throw new Error("Receipt must be 10 MB or smaller.");
    return { ...receipt, size };
  },
  prepareImage: async (receipt: LocalReceipt) => {
    const validated = await uploadService.validateLocalFile(receipt);
    if (!validated.mimeType.startsWith("image/")) return validated;
    if ((validated.size || 0) < 1_500_000) return validated;
    const compressed = await ImageManipulator.manipulateAsync(receipt.uri, [], {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG
    });
    return { uri: compressed.uri, name: receipt.name.replace(/\.\w+$/, ".jpg"), mimeType: "image/jpeg" };
  },
  upload: async (receipt: LocalReceipt): Promise<UploadResult> => {
    const user = useAuthStore.getState().user;
    if (!user?._id || !user.companyId) throw new Error("Please login again before uploading a receipt.");

    const { cloudName, uploadPreset } = getCloudinaryConfig();
    const prepared = await uploadService.prepareImage(receipt);
    const form = new FormData();

    form.append("file", {
      uri: prepared.uri,
      name: prepared.name,
      type: prepared.mimeType
    } as unknown as Blob);
    form.append("upload_preset", uploadPreset);
    form.append("folder", `inkdabba/${user.companyId}/receipts/${user._id}`);
    form.append("context", `companyId=${user.companyId}|userId=${user._id}`);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
      method: "POST",
      body: form
    });
    const data = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok || !data.secure_url || !data.public_id) {
      throw new Error(data.error?.message || "Cloudinary receipt upload failed.");
    }

    return {
      url: data.secure_url,
      publicId: data.public_id,
      type: prepared.mimeType || data.resource_type || "application/octet-stream"
    };
  }
};
