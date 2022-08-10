import { CardContent, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import React from "react";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";

interface ProjectCodesProps {
  project: ProjectRead;
}

function ProjectCodes({ project }: ProjectCodesProps) {
  // query all users that belong to the project
  const projectCodes = ProjectHooks.useGetAllCodes(project.id);

  return (
    <React.Fragment>
      {projectCodes.isLoading && <CardContent>Loading project codes...</CardContent>}
      {projectCodes.isError && (
        <CardContent>An error occurred while loading project codes for project {project.id}...</CardContent>
      )}
      {projectCodes.isSuccess && (
        <List>
          {projectCodes.data.map((code) => (
            <ListItem disablePadding key={code.id}>
              <ListItemButton>
                <ListItemText primary={`${code.name} ID: ${code.id}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </React.Fragment>
  );
}

export default ProjectCodes;
