import { createFileRoute, Outlet } from "@tanstack/react-router";
import ClassifierDialog from "../../../../components/Classifier/Dialog/ClassifierDialog.tsx";
import CodeCreateDialog from "../../../../components/Code/CodeCreateDialog.tsx";
import CodeEditDialog from "../../../../components/Code/CodeEditDialog.tsx";
import ConfirmationDialog from "../../../../components/ConfirmationDialog/ConfirmationDialog.tsx";
import DocumentUploadDialog from "../../../../components/DocumentUpload/DocumentUploadDialog.tsx";
import FolderCreateDialog from "../../../../components/Folder/FolderCreateDialog.tsx";
import FolderEditDialog from "../../../../components/Folder/FolderEditDialog.tsx";
import LLMDialog from "../../../../components/LLMDialog/LLMDialog.tsx";
import MemoDialog from "../../../../components/Memo/MemoDialog/MemoDialog.tsx";
import ProjectSettingsDialog from "../../../../components/ProjectSettings/ProjectSettingsDialog.tsx";
import QuickCommandMenu from "../../../../components/QuickCommandMenu/QuickCommandMenu.tsx";
import { ShortcutManager } from "../../../../components/ShortcutManager/ShortcutManager.tsx";
import TagCreateDialog from "../../../../components/Tag/TagCreateDialog.tsx";
import TagEditDialog from "../../../../components/Tag/TagEditDialog.tsx";
import DialMenu from "../../../../layouts/DialMenu/DialMenu.tsx";

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
      <DialMenu />
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
