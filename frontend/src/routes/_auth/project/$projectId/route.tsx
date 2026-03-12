import { CodeCreateDialog, CodeEditDialog } from "@core/code";
import { FolderCreateDialog, FolderEditDialog } from "@core/folder";
import { MemoDialog } from "@core/memo";
import { QuickCommandMenu, ShortcutManager } from "@core/navigation";
import { ConfirmationDialog } from "@core/notification";
import { TagCreateDialog, TagEditDialog } from "@core/tag";
// eslint-disable-next-line local/no-internal-modules-public-entry
import { AnnoActions } from "@features/annotation/store/annoSlice";
import { ClassifierDialog } from "@features/classifier";
import { DocumentUploadDialog } from "@features/document-upload";
import { LLMAssistantDialog } from "@features/llm-assistant";
import { ProjectSettingsDialog } from "@features/project-settings";
// eslint-disable-next-line local/no-internal-modules-public-entry
import { SearchActions } from "@features/search/store/documentSearchSlice";
// eslint-disable-next-line boundaries/element-types
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useCallback } from "react";

// TODO: This component currently wires up global dialogs with global client state. This leads to excessive prop drilling.

export const Route = createFileRoute("/_auth/project/$projectId")({
  params: {
    parse: ({ projectId }) => ({ projectId: parseInt(projectId) }),
  },
  component: ProjectRouteLayout,
});

function ProjectRouteLayout() {
  const projectId = Route.useParams({ select: (params) => params.projectId });
  const dispatch = useAppDispatch();
  // eslint-disable-next-line local/no-cross-slice-access
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);

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

  const handleCodeDeleted = useCallback(
    (codeId: number) => {
      dispatch(AnnoActions.onDeleteCode(codeId));
    },
    [dispatch],
  );

  const handleToggleCodeVisibility = useCallback(
    (codeIds: number[]) => dispatch(AnnoActions.toggleCodeVisibility(codeIds)),
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
      <CodeEditDialog onCodeUpdated={handleCodeUpdated} onCodeDeleted={handleCodeDeleted} />
      <ConfirmationDialog />
      <ProjectSettingsDialog
        projectId={projectId}
        hiddenCodeIds={hiddenCodeIds}
        onToggleCodeVisibility={handleToggleCodeVisibility}
      />
      <DocumentUploadDialog projectId={projectId} />
      <LLMAssistantDialog />
      <ClassifierDialog />
      <QuickCommandMenu projectId={projectId} />
      <ShortcutManager />
    </>
  );
}
