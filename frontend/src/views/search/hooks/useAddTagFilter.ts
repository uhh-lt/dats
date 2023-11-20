import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import { useNavigateIfNecessary } from "./useNavigateIfNecessary";

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
      dispatch(SearchActions.onAddTagFilter({ tagId }));
      // dispatch(SearchActions.addFilter(createDocumentTagFilter(tagId)));
      // dispatch(SearchActions.clearSelectedDocuments());
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
}
