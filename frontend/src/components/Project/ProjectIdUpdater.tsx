import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { ProjectActions } from "./projectSlice.ts";

function ProjectIdUpdater() {
  const { projectId } = useParams();

  // global client state
  const currentProjectId = useAppSelector((state) => state.project.projectId);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!projectId) return;

    const pid = parseInt(projectId);
    if (currentProjectId !== pid) {
      dispatch(ProjectActions.changeProject(pid));
    }
  }, [currentProjectId, dispatch, projectId]);

  return null;
}

export default ProjectIdUpdater;
