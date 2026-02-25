import { createFileRoute, Outlet } from "@tanstack/react-router";
import CodeCreateDialog from "../../../../core/code/dialog/CodeCreateDialog";
import CodeEditDialog from "../../../../core/code/dialog/CodeEditDialog";
import FolderCreateDialog from "../../../../core/folder/dialog/FolderCreateDialog";
import FolderEditDialog from "../../../../core/folder/dialog/FolderEditDialog";
import MemoDialog from "../../../../core/memo/dialog/MemoDialog";
import QuickCommandMenu from "../../../../core/navigation/quick-command/QuickCommandMenu";
import { ShortcutManager } from "../../../../core/navigation/shortcut/ShortcutManager";
import ConfirmationDialog from "../../../../core/notification/confirmation/ConfirmationDialog";
import TagCreateDialog from "../../../../core/tag/dialog/TagCreateDialog";
import TagEditDialog from "../../../../core/tag/dialog/TagEditDialog";
import ClassifierDialog from "../../../../features/classifier/views/dialog/ClassifierDialog";
import DocumentUploadDialog from "../../../../features/document-upload/views/dialog/DocumentUploadDialog";
import LLMDialog from "../../../../features/llm-assistant/views/dialog/LLMAssistantDialog";
import ProjectSettingsDialog from "../../../../features/project-settings/views/dialog/ProjectSettingsDialog";

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
      <LLMDialog />
      <ClassifierDialog />
      <QuickCommandMenu projectId={projectId} />
      <ShortcutManager />
    </>
  );
}
