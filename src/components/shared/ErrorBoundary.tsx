import { AlertTriangle } from "lucide-react-native";
import { Component, ReactNode } from "react";
import { Text, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { GradientBackground } from "../GradientBackground";
import { PrimaryButton } from "../ui/PrimaryButton";
import { MotionView } from "./Motion";

type Props = { children: ReactNode };
type State = { error: Error | null };

const ErrorUI = ({ message, onReset }: { message: string; onReset: () => void }) => {
  const c = useThemeColors();
  return (
    <GradientBackground>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
        <MotionView direction="scale" style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <AlertTriangle color={c.error} size={32} strokeWidth={1.9} />
        </MotionView>
        <Text style={{ fontSize: 24, fontWeight: "800", letterSpacing: -0.5, color: c.text, marginBottom: 8, textAlign: "center" }}>Something went wrong</Text>
        <Text style={{ maxWidth: 340, fontSize: 15, color: c.muted, textAlign: "center", lineHeight: 21, marginBottom: 28 }}>
          {message || "An unexpected error occurred."}
        </Text>
        <PrimaryButton label="Try Again" onPress={onReset} />
      </View>
    </GradientBackground>
  );
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return <ErrorUI message={this.state.error.message} onReset={this.reset} />;
    return this.props.children;
  }
}
