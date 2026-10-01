import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { BookmarkCheck, BookmarkPlus, Layers, Trash2, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { useThemeColors } from "../../hooks/useTheme";
import { templateService } from "../../services/template.service";
import { ExpenseForm, ExpenseTemplate } from "../../types";
import { AdaptiveSheet } from "../shared/AdaptiveSheet";
import { MotionPressable, MotionView } from "../shared/Motion";
import { currency } from "../../utils/formatters";
import { PrimaryButton } from "../ui/PrimaryButton";

type Props = {
  visible: boolean;
  currentForm: ExpenseForm;
  onLoad: (template: ExpenseTemplate) => void;
  onClose: () => void;
};

export const TemplateSheet = ({ visible, currentForm, onLoad, onClose }: Props) => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const query = useQuery({
    queryKey: ["expense-templates"],
    queryFn: templateService.list,
    enabled: visible
  });

  const saveTemplate = useMutation({
    mutationFn: () =>
      templateService.create({
        name: saveName.trim(),
        category: currentForm.category,
        paymentMode: currentForm.paymentMode,
        projectName: currentForm.projectName.trim(),
        clientName: currentForm.clientName.trim(),
        description: currentForm.description.trim(),
        amount: currentForm.amount || undefined
      }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
      setSaveName("");
      setShowSaveInput(false);
    },
    onError: (err) => Alert.alert("Could not save template", err.message)
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: string) => templateService.delete(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["expense-templates"] });
    },
    onError: (err) => Alert.alert("Could not delete template", err.message)
  });

  const templates = query.data || [];
  const canSave = saveName.trim().length >= 1;

  const handleLoad = (template: ExpenseTemplate) => {
    Haptics.selectionAsync();
    onLoad(template);
    onClose();
  };

  const handleDelete = (template: ExpenseTemplate) => {
    Alert.alert("Delete template?", `Remove "${template.name}" from your saved templates.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTemplate.mutate(template._id)
      }
    ]);
  };

  const handleClose = () => {
    setSaveName("");
    setShowSaveInput(false);
    onClose();
  };

  return (
    <AdaptiveSheet visible={visible} onClose={handleClose}>
            {/* Header */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 0, marginBottom: 6 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                <Layers color={c.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>Templates</Text>
                <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 1 }}>Load a saved template or save this form</Text>
              </View>
              <MotionPressable onPress={handleClose} accessibilityRole="button" accessibilityLabel="Close templates" hitSlop={8} pressScale={0.9} style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surfaceMuted, alignItems: "center", justifyContent: "center" }}>
                <X color={c.muted} size={17} strokeWidth={2.6} />
              </MotionPressable>
            </View>

            {/* Save current form as template */}
            <View style={{ paddingHorizontal: 0, marginBottom: 16 }}>
              {!showSaveInput ? (
                <MotionPressable accessibilityRole="button"
                  onPress={() => setShowSaveInput(true)}
                  haptic
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    minHeight: 52,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: c.primary,
                    borderStyle: "dashed",
                    backgroundColor: c.primarySoft,
                    paddingHorizontal: 16
                  }}
                >
                  <BookmarkPlus color={c.primary} size={17} />
                  <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: c.primary }}>Save current form as template</Text>
                </MotionPressable>
              ) : (
                <MotionView direction="scale" style={{ borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.surfaceStrong, padding: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>Template name</Text>
                  <TextInput
                    value={saveName}
                    onChangeText={setSaveName}
                    placeholder='e.g. "Monthly internet bill"'
                    placeholderTextColor={c.muted}
                    autoFocus
                    style={{
                      fontSize: 17,
                      fontWeight: "600",
                      color: c.text,
                      borderBottomWidth: 1.5,
                      borderBottomColor: c.primary,
                      paddingBottom: 8,
                      marginBottom: 12
                    }}
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton label="Cancel" onPress={() => { setSaveName(""); setShowSaveInput(false); }} variant="ghost" compact />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PrimaryButton
                        label="Save"
                        onPress={() => saveTemplate.mutate()}
                        loading={saveTemplate.isPending}
                        disabled={!canSave}
                        compact
                        icon={<BookmarkCheck color={c.onPrimary} size={15} />}
                      />
                    </View>
                  </View>
                </MotionView>
              )}
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: c.divider, marginHorizontal: 0, marginBottom: 16 }} />

            {/* Templates list */}
            <View style={{ paddingBottom: 8 }}>
              {query.isLoading ? (
                <Text style={{ fontSize: 14, fontWeight: "500", color: c.muted, textAlign: "center", paddingVertical: 20 }}>Loading templates...</Text>
              ) : templates.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 28 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                    <Layers color={c.primary} size={24} />
                  </View>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: c.text }}>No templates yet</Text>
                  <Text style={{ fontSize: 13, fontWeight: "400", color: c.muted, textAlign: "center", marginTop: 4, lineHeight: 18 }}>
                    Save your current form to quickly reuse common expense details.
                  </Text>
                </View>
              ) : (
                templates.map((template, index) => (
                  <TemplateRow
                    index={index}
                    key={template._id}
                    template={template}
                    isLast={index === templates.length - 1}
                    onLoad={() => handleLoad(template)}
                    onDelete={() => handleDelete(template)}
                    c={c}
                  />
                ))
              )}
            </View>
    </AdaptiveSheet>
  );
};

const TemplateRow = ({
  index,
  template,
  isLast,
  onLoad,
  onDelete,
  c
}: {
  index: number;
  template: ExpenseTemplate;
  isLast: boolean;
  onLoad: () => void;
  onDelete: () => void;
  c: ReturnType<typeof useThemeColors>;
}) => (
  <MotionView delay={index * 40} direction="up">
  <MotionPressable accessibilityRole="button"
    onPress={onLoad}
    haptic
    pressScale={0.98}
    style={{
      flexDirection: "row",
      alignItems: "center",
      minHeight: 64,
      paddingVertical: 10,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: c.divider
    }}
  >
    <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: c.primarySoft, alignItems: "center", justifyContent: "center", marginRight: 12 }}>
      <BookmarkCheck color={c.primary} size={17} />
    </View>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: c.text }} numberOfLines={1}>{template.name}</Text>
      <Text style={{ fontSize: 13, fontWeight: "500", color: c.muted, marginTop: 2 }} numberOfLines={1}>
        {template.category} · {template.paymentMode}
        {template.projectName ? ` · ${template.projectName}` : ""}
      </Text>
    </View>
    {template.amount ? (
      <Text style={{ fontSize: 14, fontWeight: "800", color: c.text, marginRight: 10, fontVariant: ["tabular-nums"] }}>{currency(Number(template.amount))}</Text>
    ) : null}
    <MotionPressable
      onPress={onDelete}
      hitSlop={8}
      pressScale={0.9}
      accessibilityRole="button"
      accessibilityLabel={`Delete ${template.name}`}
      style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: c.errorSoft, alignItems: "center", justifyContent: "center" }}
    >
      <Trash2 color={c.error} size={16} />
    </MotionPressable>
  </MotionPressable>
  </MotionView>
);
