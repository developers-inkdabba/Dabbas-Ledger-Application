import * as ImagePicker from "expo-image-picker";
import { Camera } from "expo-camera";

export const requestCamera = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  return status === "granted";
};

export const requestMedia = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
};
