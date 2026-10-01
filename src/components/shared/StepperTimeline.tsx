import { Check, X } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { useIsDark, useThemeColors } from "../../hooks/useTheme";
import { MotionView } from "./Motion";

export type StepperStep = {
  id: string;
  label: string;
  sublabel?: string;
  actor?: string;
  timestamp?: string;
  status: "done" | "active" | "pending" | "error";
};

/** Vertical approval timeline; each step reveals in sequence. */
export const StepperTimeline = ({ steps }: { steps: StepperStep[] }) => {
  const c = useThemeColors();
  const onFill = useIsDark() ? c.background : "#FFFFFF";
  const dotColor = { done: c.success, active: c.primary, error: c.error, pending: c.border };
  const haloColor = { done: c.successSoft, active: c.primarySoft, error: c.errorSoft, pending: "transparent" };

  return (
    <View>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const pending = step.status === "pending";
        return (
          <MotionView key={step.id} delay={i * 90} direction="up" style={s.row}>
            <View style={s.track}>
              <View style={[s.halo, { backgroundColor: haloColor[step.status] }]}>
                <View style={[s.dot, { backgroundColor: pending ? "transparent" : dotColor[step.status], borderWidth: pending ? 2 : 0, borderColor: c.borderStrong }]}>
                  {step.status === "done" ? <Check size={11} color={onFill} strokeWidth={3.2} /> : null}
                  {step.status === "active" ? <View style={[s.innerDot, { backgroundColor: onFill }]} /> : null}
                  {step.status === "error" ? <X size={11} color={onFill} strokeWidth={3.2} /> : null}
                </View>
              </View>
              {!isLast ? <View style={[s.line, { backgroundColor: step.status === "done" ? c.success : c.divider }]} /> : null}
            </View>
            <View style={[s.content, { paddingBottom: isLast ? 0 : 22 }]}>
              <Text style={[s.label, { color: pending ? c.muted : c.text }]}>{step.label}</Text>
              {step.sublabel ? <Text style={[s.sublabel, { color: c.muted }]}>{step.sublabel}</Text> : null}
              {step.actor || step.timestamp ? (
                <View style={s.meta}>
                  {step.actor ? <Text style={[s.metaText, { color: c.primary }]}>{step.actor}</Text> : null}
                  {step.timestamp ? <Text style={[s.metaText, { color: c.muted }]}>{step.timestamp}</Text> : null}
                </View>
              ) : null}
            </View>
          </MotionView>
        );
      })}
    </View>
  );
};

const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 14 },
  track: { alignItems: "center", width: 30 },
  halo: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  innerDot: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, width: 2, borderRadius: 1, marginVertical: 3, minHeight: 18 },
  content: { flex: 1, paddingTop: 4 },
  label: { fontSize: 15, fontWeight: "700", lineHeight: 20, letterSpacing: -0.2 },
  sublabel: { fontSize: 13, fontWeight: "500", marginTop: 2, lineHeight: 18 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  metaText: { fontSize: 12, fontWeight: "600" }
});
