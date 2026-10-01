import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../../src/store/auth.store";

export default function AdminLayout() {
  const user = useAuthStore((state) => state.user);

  if (user?.role !== "admin") {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
