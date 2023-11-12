import { useEffect } from "react";
import ProjectHooks from "../../api/ProjectHooks";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { useFilterSliceActions } from "./FilterProvider";

export const useInitFilterSlice = ({ projectId }: { projectId: number }) => {
  // global client state (redux)
  const filterActions = useFilterSliceActions();
  const dispatch = useAppDispatch();

  // global server state (react-query)
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);

  // effects
  useEffect(() => {
    if (!projectMetadata.data) return;
    dispatch(filterActions.init({ projectMetadata: projectMetadata.data }));
    console.log("initialized filterSlice!");
  }, [dispatch, filterActions, projectMetadata.data]);
};
