import { BBoxAnnotationEditDialog } from "@core/bbox-annotation";
import { CodeCreateDialog, CodeEditDialog } from "@core/code";
import { FeatureGuard } from "@core/feature";
import { FolderCreateDialog, FolderEditDialog } from "@core/folder";
import { MemoDialog } from "@core/memo";
import { parseIdParam, QuickCommandMenu, ShortcutManager } from "@core/navigation";
import { projectQueries } from "@core/project";
import { SentenceAnnotationEditDialog } from "@core/sentence-annotation";
import { SpanAnnotationEditDialog } from "@core/span-annotation";
import { TagCreateDialog, TagEditDialog } from "@core/tag";
import { CodeShortcutManagerDialog } from "@features/annotation";
// eslint-disable-next-line local/no-internal-modules-public-entry
import { AnnotationsActions } from "@features/annotation/store/annotationsSlice";
import { ClassifierDialog } from "@features/classifier";
import { DocumentUploadDialog } from "@features/document-upload";
import { LLMAssistantDialog } from "@features/llm-assistant";
import { ProjectSettingsDialog } from "@features/project-settings";
// eslint-disable-next-line local/no-internal-modules-public-entry
import { DocumentSearchActions } from "@features/search/store/documentSearchSlice";
import { CircularProgress } from "@mui/material";
// eslint-disable-next-line boundaries/element-types
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router";
import { useCallback } from "react";

// TODO: This component currently wires up global dialogs with global client state. This leads to excessive prop drilling.

export const Route = createFileRoute("/_auth/project/$projectId")({
  params: {
    parse: ({ projectId }) => ({ projectId: parseIdParam(projectId) }),
  },
  // the guard needs the enabled features of the project; the feature states load where they are shown
  context: () => ({ userProjectsOptions: projectQueries.userProjects() }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.userProjectsOptions);
  },
  pendingComponent: () => <CircularProgress />,
  component: ProjectRouteLayout,
});

function ProjectRouteLayout() {
  const projectId = Route.useParams({ select: (params) => params.projectId });
  const dispatch = useAppDispatch();
  // eslint-disable-next-line local/no-cross-slice-access
  const hiddenCodeIds = useAppSelector((state) => state.annotations.hiddenCodeIds);
  // the feature of the deepest page that declares one
  const routeFeature = useMatches({
    select: (matches) => matches.findLast((match) => match.staticData.feature !== undefined)?.staticData.feature,
  });

  const handleFoldersCreated = useCallback(
    (folderIdsToExpand: number[]) =>
      dispatch(DocumentSearchActions.expandFolders(folderIdsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleTagsCreated = useCallback(
    (tagIdsToExpand: number[]) => dispatch(DocumentSearchActions.expandTags(tagIdsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleCodesCreated = useCallback(
    (idsToExpand: number[]) => dispatch(AnnotationsActions.expandCodes(idsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleCodeUpdated = useCallback(
    (idsToExpand: number[]) => dispatch(AnnotationsActions.expandCodes(idsToExpand.map((id) => id.toString()))),
    [dispatch],
  );

  const handleCodeDeleted = useCallback(
    (codeId: number) => {
      dispatch(AnnotationsActions.onDeleteCode(codeId));
    },
    [dispatch],
  );

  const handleToggleCodeVisibility = useCallback(
    (codeIds: number[]) => dispatch(AnnotationsActions.toggleCodeVisibility(codeIds)),
    [dispatch],
  );

  return (
    <>
      <FeatureGuard feature={routeFeature}>
        <Outlet />
      </FeatureGuard>
      {/* Global Dialogs */}
      <MemoDialog />
      <TagCreateDialog projectId={projectId} onTagsCreated={handleTagsCreated} />
      <TagEditDialog />
      <FolderCreateDialog projectId={projectId} onFoldersCreated={handleFoldersCreated} />
      <FolderEditDialog />
      <CodeCreateDialog projectId={projectId} onCodesCreated={handleCodesCreated} />
      <CodeEditDialog onCodeUpdated={handleCodeUpdated} onCodeDeleted={handleCodeDeleted} />
      <CodeShortcutManagerDialog projectId={projectId} />
      <SpanAnnotationEditDialog projectId={projectId} />
      <SentenceAnnotationEditDialog projectId={projectId} />
      <BBoxAnnotationEditDialog projectId={projectId} />
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
