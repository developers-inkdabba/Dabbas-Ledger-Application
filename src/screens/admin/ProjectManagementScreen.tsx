import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { ProjectCard } from "../../components/admin/ProjectCard";
import { AccountButton } from "../../components/shared/AccountButton";
import { ListScreen, useListFrame } from "../../components/shared/AppContainer";
import { ConfirmSheet } from "../../components/shared/ConfirmSheet";
import { EmptyState } from "../../components/shared/EmptyState";
import { FinanceSectionHeader, PremiumCard } from "../../components/shared/FinanceUI";
import { LoadingSkeleton } from "../../components/shared/LoadingSkeleton";
import { ScreenHeader } from "../../components/shared/ScreenHeader";
import { SelectionControl } from "../../components/shared/SelectionControl";
import { FormField } from "../../components/ui/FormField";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useThemeColors } from "../../hooks/useTheme";
import { adminService } from "../../services/admin.service";
import { Project } from "../../types";

type ProjectForm = {
  projectName: string;
  clientName: string;
  budget: string;
  status: Project["status"];
};

const emptyForm: ProjectForm = { projectName: "", clientName: "", budget: "", status: "active" };
const projectStatuses: Project["status"][] = ["active", "completed", "archived"];

export const ProjectManagementScreen = () => {
  const c = useThemeColors();
  const queryClient = useQueryClient();
  const { scrollY, onScroll, contentContainerStyle } = useListFrame();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const query = useQuery({ queryKey: ["projects"], queryFn: adminService.projects });
  const save = useMutation({
    mutationFn: () => {
      const payload = { ...form, budget: Number(form.budget) };
      return editingProject ? adminService.updateProject(editingProject._id, payload) : adminService.createProject(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      closeForm();
    },
    onError: (error) => Alert.alert("Could not save project", error.message)
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteTarget(null);
      closeForm();
    },
    onError: (error) => Alert.alert("Could not delete project", friendlyProjectError(error.message))
  });

  const closeForm = () => {
    setForm(emptyForm);
    setEditingProject(null);
    setFormOpen(false);
  };
  const openCreate = () => {
    if (formOpen && !editingProject) {
      closeForm();
      return;
    }
    setForm(emptyForm);
    setEditingProject(null);
    setFormOpen(true);
  };
  const openEdit = (project: Project) => {
    setEditingProject(project);
    setForm({
      projectName: project.projectName,
      clientName: project.clientName,
      budget: String(project.budget || ""),
      status: project.status
    });
    setFormOpen(true);
  };
  const confirmDelete = (project: Project) => setDeleteTarget(project);

  const listHeader = (<>
      <ScreenHeader
        title="Projects"
        subtitle="Budgets and client assignments"
        eyebrow="Admin setup"
        right={
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <PrimaryButton
              label={formOpen && !editingProject ? "Close" : "Add"}
              onPress={openCreate}
              variant="secondary"
              icon={formOpen && !editingProject ? <X color={c.primary} size={16} strokeWidth={2.5} /> : <Plus color={c.primary} size={16} strokeWidth={2.5} />}
              compact
            />
            <AccountButton />
          </View>
        }
      />
      {formOpen ? (
        <PremiumCard style={{ marginBottom: 16, padding: 18 }}>
          <View style={{ marginBottom: 18, flexDirection: "row", alignItems: "center" }}>
            <View style={{ marginRight: 12, width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: c.primarySoft }}>
              <FolderPlus color={c.primary} size={22} />
            </View>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: "800", letterSpacing: -0.4, color: c.text }}>{editingProject ? "Edit project" : "New project"}</Text>
              <Text style={{ marginTop: 1, fontSize: 14, color: c.muted }}>{editingProject ? "Update budget, client, and state" : "Create client budget tracking"}</Text>
            </View>
          </View>
          <FormField label="Project Name" value={form.projectName} onChangeText={(projectName) => setForm((prev) => ({ ...prev, projectName }))} />
          <FormField label="Client Name" value={form.clientName} onChangeText={(clientName) => setForm((prev) => ({ ...prev, clientName }))} />
          <FormField label="Budget" value={form.budget} onChangeText={(budget) => setForm((prev) => ({ ...prev, budget: budget.replace(/[^\d.]/g, "") }))} keyboardType="decimal-pad" />
          <Text style={{ marginBottom: 8, marginLeft: 4, fontSize: 13, fontWeight: "600", color: c.textSoft }}>Status</Text>
          <SelectionControl
            label="Project status"
            value={form.status}
            onChange={(status) => setForm((prev) => ({ ...prev, status }))}
            options={projectStatuses.map((status) => ({ value: status, label: status.charAt(0).toUpperCase() + status.slice(1) }))}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            {editingProject ? (
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Cancel" onPress={closeForm} variant="ghost" />
              </View>
            ) : null}
            <View style={{ flex: 1 }}>
              <PrimaryButton
                label={editingProject ? "Save Changes" : "Create Project"}
                onPress={() => save.mutate()}
                loading={save.isPending}
                disabled={!form.projectName || !form.clientName || !Number(form.budget)}
              />
            </View>
          </View>
        </PremiumCard>
      ) : null}
      <FinanceSectionHeader title="Project ledger" subtitle="Budget envelopes available to the team" top={formOpen ? 4 : 0} />
  </>);

  return (
    <ListScreen scrollY={scrollY}>
        <Animated.FlatList
          data={query.isLoading ? [] : query.data || []}
          ListHeaderComponent={listHeader}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={contentContainerStyle}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onEdit={() => openEdit(item)}
              onDelete={() => confirmDelete(item)}
              deleting={remove.isPending && remove.variables === item._id}
            />
          )}
          ListEmptyComponent={query.isLoading ? <LoadingSkeleton /> : <EmptyState title="No projects yet" message="Create a project to start tracking budgets." />}
        />
      <ConfirmSheet
        visible={Boolean(deleteTarget)}
        title="Delete project?"
        message={`${deleteTarget?.projectName || "This project"} will be removed from the project ledger. Existing expenses will keep their saved project name.`}
        confirmLabel={remove.isPending ? "Deleting..." : "Delete Project"}
        loading={remove.isPending}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget._id)}
        onClose={() => setDeleteTarget(null)}
      />
    </ListScreen>
  );
};

const friendlyProjectError = (message: string) =>
  message.toLowerCase().includes("permission")
    ? "Your account does not have permission to delete this project. Confirm your admin role and deployed Firestore rules."
    : message;
