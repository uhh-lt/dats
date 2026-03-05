import { CodeCreateDialog, CodeEditDialog } from "@core/code";
import { FolderCreateDialog, FolderEditDialog } from "@core/folder";
import { MemoDialog } from "@core/memo";
import { QuickCommandMenu, ShortcutManager } from "@core/navigation";
import { ConfirmationDialog } from "@core/notification";
import { TagCreateDialog, TagEditDialog } from "@core/tag";
import { AnnoActions } from "@features/annotation";
import { ClassifierDialog } from "@features/classifier";
import { DocumentUploadDialog } from "@features/document-upload";
import { LLMAssistantDialog } from "@features/llm-assistant";
import { ProjectSettingsDialog } from "@features/project-settings";
import { SearchActions } from "@features/search";
import { useAppDispatch } from "@plugins/redux";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCallback } from "react";

export const Route = createFileRoute("/_auth/project/$projectId")({
  params: {
    parse: ({ projectId }) => ({ projectId: parseInt(projectId) }),
  },
  component: ProjectRouteLayout,
});

function ProjectRouteLayout() {
  const projectId = Route.useParams({ select: (params) => params.projectId });
  const dispatch = useAppDispatch();

  const handleFoldersCreated = useCallback(
    (folderIdsToExpand: number[]) =>
      dispatch(SearchActions.expandFolders(folderIdsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleTagsCreated = useCallback(
    (tagIdsToExpand: number[]) => dispatch(SearchActions.expandTags(tagIdsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleCodesCreated = useCallback(
    (idsToExpand: number[]) => dispatch(AnnoActions.expandCodes(idsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleCodeUpdated = useCallback(
    (idsToExpand: number[]) => dispatch(AnnoActions.expandCodes(idsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  return (
    <>
      <Outlet />
      {/* Global Dialogs */}
      <MemoDialog />
      <TagCreateDialog projectId={projectId} onTagsCreated={handleTagsCreated} />
      <TagEditDialog />
      <FolderCreateDialog projectId={projectId} onFoldersCreated={handleFoldersCreated} />
      <FolderEditDialog />
      <CodeCreateDialog projectId={projectId} onCodesCreated={handleCodesCreated} />
      <CodeEditDialog onCodeUpdated={handleCodeUpdated} />
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
