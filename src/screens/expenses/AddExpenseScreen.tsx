import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { AlertTriangle, BookmarkCheck, Building2, CalendarDays, CheckCircle2, FileText, FolderKanban, Layers } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";
import { AmountInput } from "../../components/expense/AmountInput";
import { CategoryChips } from "../../components/expense/CategoryChips";
import { PaymentModeSelector } from "../../components/expense/PaymentModeSelector";
import { ReceiptUploader } from "../../components/expense/ReceiptUploader";
import { TemplateSheet } from "../../components/expense/TemplateSheet";
import { AccountButton } from "../../components/shared/AccountButton";
import { AppContainer } from "../../components/shared/AppContainer";
import { FinanceSectionHeader, PremiumCard, ProgressBar } from "../../components/shared/FinanceUI";
import { MotionPressable, MotionView } from "../../components/shared/Motion";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { FormField } from "../../components/ui/FormField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { categories } from "../../constants/theme";
import { useThemeColors } from "../../hooks/useTheme";
import { expenseService } from "../../services/expense.service";
import { LocalReceipt, uploadService } from "../../services/upload.service";
import { ExpenseForm, ExpenseTemplate } from "../../types";
import { formatDateKey, formatReadableDateKey, parseDateKey, todayDateKey } from "../../utils/dates";
import { currency, toAmount } from "../../utils/formatters";
import { validateExpense } from "../../utils/validators";

type TouchedField = keyof ExpenseForm;

const emptyForm = (): ExpenseForm => ({
  amount: "",
  date: todayDateKey(),
  category: categories[0],
  projectName: "",
  clientName: "",
  paymentMode: "UPI",
  description: ""
});

export const AddExpenseScreen = () => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const [receipt, setReceipt] = useState<LocalReceipt | undefined>();
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<TouchedField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(emptyForm());

  const errors = useMemo(() => validateExpense(form), [form]);
  const canSubmit = Object.keys(errors).length === 0;
  const selectedDate = useMemo(() => parseDateKey(form.date), [form.date]);
  const visibleError = (field: TouchedField) => (touched[field] || submitAttempted ? errors[field] : undefined);
  const markTouched = (field: TouchedField) => setTouched((prev) => ({ ...prev, [field]: true }));

  const updateField = <K extends keyof ExpenseForm>(key: K, value: ExpenseForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Duplicate detection: look for same amount+category+date in existing expenses
  const existingQuery = useQuery({
    queryKey: ["expenses-for-dup-check"],
    queryFn: expenseService.allForReports,
    staleTime: 60_000
  });

  const duplicateWarning = useMemo(() => {
    const amount = toAmount(form.amount);
    if (!amount || !form.category || !form.date) return null;
    const match = (existingQuery.data || []).find(
      (e) =>
        e.amount === amount &&
        e.category === form.category &&
        e.date === form.date &&
        e.status !== "rejected"
    );
    if (!match) return null;
    return `Possible duplicate: you already submitted ${currency(amount)} for ${form.category} on ${formatReadableDateKey(form.date) || form.date}.`;
  }, [form.amount, form.category, form.date, existingQuery.data]);

  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS !== "ios") setDatePickerOpen(false);
    if (event.type === "dismissed" || !date) return;
    markTouched("date");
    updateField("date", formatDateKey(date));
  };

  const handleTemplateLoad = (template: ExpenseTemplate) => {
    setForm((prev) => ({
      ...prev,
      category: template.category,
      paymentMode: template.paymentMode,
      projectName: template.projectName,
      clientName: template.clientName,
      description: template.description,
      amount: template.amount || prev.amount
    }));
    setTouched({});
  };

  const submit = useMutation({
    mutationFn: async () => {
      let receiptFields = {};
      if (receipt) {
        const uploaded = await uploadService.upload(receipt);
        receiptFields = { receiptUrl: uploaded.url, receiptPublicId: uploaded.publicId, receiptType: uploaded.type };
      }
      return expenseService.create({
        ...form,
        projectName: form.projectName.trim(),
        clientName: form.clientName.trim(),
        description: form.description.trim(),
        ...receiptFields
      });
    },
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-insights"] });
      queryClient.invalidateQueries({ queryKey: ["reviewer-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["all-expenses-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["expenses-for-dup-check"] });
      Alert.alert("Expense submitted", "Your expense is now pending approval.");
      setForm(emptyForm());
      setTouched({});
      setSubmitAttempted(false);
      setReceipt(undefined);
      router.push("/expenses" as never);
    },
    onError: (error) => Alert.alert("Submission failed", error.message)
  });

  const handleSubmit = () => {
    setSubmitAttempted(true);
    if (!canSubmit) return;
    submit.mutate();
  };

  const requiredFields: TouchedField[] = ["amount", "date", "projectName", "clientName", "description"];
  const completed = requiredFields.filter((field) => !errors[field]).length;

  return (
    <AppContainer form bottomPadding={136}>
      <ScreenHeader
        title="Add Expense"
        subtitle="Create a clean reimbursement request"
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <MotionPressable hitSlop={4}
              onPress={() => setTemplateSheetOpen(true)}
              haptic
              pressScale={0.92}
              accessibilityRole="button"
              accessibilityLabel="Open templates"
              style={{ height: 40, flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, backgroundColor: c.primarySoft }}
            >
              <Layers color={c.primary} size={16} strokeWidth={2.2} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>Templates</Text>
            </MotionPressable>
            <AccountButton />
          </View>
        }
      />

      {duplicateWarning ? (
        <MotionView direction="down" style={{ marginBottom: 14, flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 16, borderWidth: 1, borderColor: c.warning, backgroundColor: c.warningSoft, padding: 14 }}>
          <AlertTriangle color={c.warning} size={18} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: c.warning }}>Possible duplicate</Text>
            <Text style={{ fontSize: 13, fontWeight: "500", color: c.text, marginTop: 2, lineHeight: 18 }}>{duplicateWarning}</Text>
          </View>
        </MotionView>
      ) : null}

      <AmountInput
        value={form.amount}
        onChangeText={(amount) => updateField("amount", amount)}
        onBlur={() => markTouched("amount")}
        error={visibleError("amount")}
      />

      <FinanceSectionHeader title="Classify" subtitle="Pick a category and payment method" top={4} />
      <CategoryChips value={form.category} onChange={(category) => updateField("category", category)} />
      <PaymentModeSelector value={form.paymentMode} onChange={(paymentMode) => updateField("paymentMode", paymentMode)} />

      <FinanceSectionHeader title="Details" subtitle="Date, project, client, and description" top={4} />
      <PremiumCard style={{ marginBottom: 20, padding: 18 }}>
        <MotionPressable
          onPress={() => {
            markTouched("date");
            setDatePickerOpen(true);
          }}
          haptic
          pressScale={0.98}
          accessibilityRole="button"
          accessibilityLabel="Choose expense date"
          style={{ marginBottom: 18, minHeight: 64, flexDirection: "row", alignItems: "center", borderRadius: 14, backgroundColor: c.surfaceStrong, paddingHorizontal: 12, borderWidth: 1, borderColor: visibleError("date") ? c.error : c.border }}
        >
          <View style={{ marginRight: 12, height: 42, width: 42, alignItems: "center", justifyContent: "center", borderRadius: 13, backgroundColor: "#FF453A" }}>
            <CalendarDays color="#FFFFFF" size={19} strokeWidth={2.2} />
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", letterSpacing: 0.4, textTransform: "uppercase", color: c.muted }}>Expense date</Text>
            <Text style={{ marginTop: 2, fontSize: 17, fontWeight: "700", color: c.text }}>{formatReadableDateKey(form.date) || form.date}</Text>
          </View>
          <View style={{ borderRadius: 10, backgroundColor: c.primarySoft, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>Change</Text>
          </View>
        </MotionPressable>
        {visibleError("date") ? <Text style={{ marginTop: -10, marginBottom: 12, marginLeft: 4, fontSize: 12, fontWeight: "600", color: c.error }}>{visibleError("date")}</Text> : null}
        {datePickerOpen ? (
          <MotionView direction="scale" style={{ marginBottom: 18, overflow: "hidden", borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.backgroundElevated }}>
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              maximumDate={new Date()}
              accentColor={c.primary}
              onChange={onDateChange}
            />
            {Platform.OS === "ios" ? (
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.divider, padding: 12 }}>
                <PrimaryButton label="Done" onPress={() => setDatePickerOpen(false)} variant="secondary" compact />
              </View>
            ) : null}
          </MotionView>
        ) : null}

        <FormField
          label="Project name"
          value={form.projectName}
          onChangeText={(projectName) => updateField("projectName", projectName)}
          onBlur={() => markTouched("projectName")}
          placeholder="e.g. Brand campaign"
          leftIcon={<FolderKanban color={c.muted} size={18} />}
          error={visibleError("projectName")}
        />
        <FormField
          label="Client name"
          value={form.clientName}
          onChangeText={(clientName) => updateField("clientName", clientName)}
          onBlur={() => markTouched("clientName")}
          placeholder="e.g. Acme Corp"
          leftIcon={<Building2 color={c.muted} size={18} />}
          error={visibleError("clientName")}
        />
        <FormField
          label="Details"
          value={form.description}
          onChangeText={(description) => updateField("description", description)}
          onBlur={() => markTouched("description")}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          error={visibleError("description")}
          placeholder="What was this expense for?"
          leftIcon={<FileText color={c.muted} size={18} />}
        />
      </PremiumCard>

      <FinanceSectionHeader title="Receipt" subtitle="Attach proof now or submit without it" top={0} />
      <ReceiptUploader value={receipt} onChange={setReceipt} />

      <PremiumCard style={{ marginBottom: 12, padding: 18 }}>
        <View style={{ marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: canSubmit ? c.successSoft : c.primarySoft }}>
            {canSubmit ? <CheckCircle2 color={c.success} size={22} /> : <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>{completed}/{requiredFields.length}</Text>}
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", letterSpacing: -0.3, color: c.text }}>{canSubmit ? "Ready to submit" : "Almost there"}</Text>
            <Text style={{ marginTop: 2, fontSize: 13, fontWeight: "500", color: c.muted }} numberOfLines={2}>
              {canSubmit ? "This request will go to approvals." : "Complete amount, project, client, and details."}
            </Text>
          </View>
          <View style={{ borderRadius: 10, backgroundColor: receipt ? c.successSoft : c.surfaceMuted, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: receipt ? c.success : c.muted }}>{receipt ? "Receipt added" : "No receipt"}</Text>
          </View>
        </View>
        <View style={{ marginBottom: 16 }}>
          <ProgressBar progress={completed / requiredFields.length} color={canSubmit ? c.success : c.primary} height={6} />
        </View>
        <PrimaryButton
          label={receipt ? "Upload & Submit" : "Submit Expense"}
          onPress={handleSubmit}
          loading={submit.isPending}
          disabled={submit.isPending || !canSubmit}
        />
        <MotionPressable
          onPress={() => setTemplateSheetOpen(true)}
          accessibilityRole="button"
          style={{ marginTop: 8, minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10 }}
        >
          <BookmarkCheck color={c.primary} size={16} />
          <Text style={{ fontSize: 14, fontWeight: "700", color: c.primary }}>Save as template</Text>
        </MotionPressable>
        {!canSubmit && submitAttempted ? <MotionView direction="down"><Text style={{ marginTop: 4, textAlign: "center", fontSize: 13, fontWeight: "600", color: c.error }}>Please fix the highlighted fields.</Text></MotionView> : null}
      </PremiumCard>

      <TemplateSheet
        visible={templateSheetOpen}
        currentForm={form}
        onLoad={handleTemplateLoad}
        onClose={() => setTemplateSheetOpen(false)}
      />
    </AppContainer>
  );
};
