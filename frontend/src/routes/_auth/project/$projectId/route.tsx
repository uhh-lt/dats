import { CodeCreateDialog, CodeEditDialog } from "@core/code";
import { FolderCreateDialog, FolderEditDialog } from "@core/folder";
import { MemoDialog } from "@core/memo";
import { QuickCommandMenu, ShortcutManager } from "@core/navigation";
import { ConfirmationDialog } from "@core/notification";
import { TagCreateDialog, TagEditDialog } from "@core/tag";
import { ClassifierDialog } from "@features/classifier";
import { DocumentUploadDialog } from "@features/document-upload";
import { LLMAssistantDialog } from "@features/llm-assistant";
import { ProjectSettingsDialog } from "@features/project-settings";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId")({
  params: {
    parse: ({ projectId }) => ({ projectId: parseInt(projectId) }),
  },
  component: ProjectRouteLayout,
});

function ProjectRouteLayout() {
  const projectId = Route.useParams({ select: (params) => params.projectId });

  return (
    <>
      <Outlet />
      {/* Global Dialogs */}
      <MemoDialog />
      <TagCreateDialog projectId={projectId} />
      <TagEditDialog />
      <FolderCreateDialog projectId={projectId} />
      <FolderEditDialog />
      <CodeCreateDialog projectId={projectId} />
      <CodeEditDialog />
      <ConfirmationDialog />
      <ProjectSettingsDialog projectId={projectId} />
      <DocumentUploadDialog projectId={projectId} />
      <LLMAssistantDialog />
      <ClassifierDialog />
      <QuickCommandMenu projectId={projectId} />
      <ShortcutManager />
    </>
  );
}
