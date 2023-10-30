import { useCallback } from "react";
import { createDocumentTagFilter } from "../SearchFilter";
import { SearchActions } from "../searchSlice";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { useNavigateIfNecessary } from "./useNavigateIfNecessary";
import { useParams } from "react-router-dom";

export function useAddTagFilter() {
  // router
  const { projectId } = useParams() as {
    projectId: string;
  };

  // redux (global client state)
  const dispatch = useAppDispatch();

  // custom hooks
  const navigateIfNecessary = useNavigateIfNecessary();

  return useCallback(
    (tagId: number) => {
      dispatch(SearchActions.addFilter(createDocumentTagFilter(tagId)));
      dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
}
