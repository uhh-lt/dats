import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import { useNavigateIfNecessary } from "./useNavigateIfNecessary.ts";

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
      dispatch(SearchFilterActions.onAddTagFilter({ tagId }));
      navigateIfNecessary(`/project/${projectId}/search/`);
    },
    [dispatch, navigateIfNecessary, projectId],
  );
}
