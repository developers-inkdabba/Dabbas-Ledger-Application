import { Tabs } from "expo-router";
import { BottomNav } from "../../src/components/navigation/BottomNav";
import { useReducedMotion } from "../../src/components/shared/MotionPreferences";

export default function TabLayout() {
  const reduced = useReducedMotion();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "fade",
        transitionSpec: { animation: "timing", config: { duration: 180 } },
        tabBarStyle: { display: "none" }
      }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="expenses" options={{ title: "Expenses" }} />
      <Tabs.Screen name="add" options={{ title: "Add" }} />
      <Tabs.Screen name="approvals" options={{ title: "Approvals" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="reports" options={{ title: "Reports", href: null }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", href: null }} />
      <Tabs.Screen name="admin" options={{ title: "Admin", href: null }} />
    </Tabs>
  );
}
