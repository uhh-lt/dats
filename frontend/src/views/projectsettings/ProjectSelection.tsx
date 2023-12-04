import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import React, { useState } from "react";
import { Link, Link as RouterLink, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import UserHooks from "../../api/UserHooks";
import ProjectSelectionContextMenu from "./ProjectSelectionContextMenu";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";

function ProjectSelection() {
  const { user } = useAuth();

  // react router
  const { projectId } = useParams() as { projectId: string };

  // global server state (react query)
  const projects = UserHooks.useGetProjects(user?.id);

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<number>();
  const onContextMenu = (projectId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(projectId);
  };

  return (
    <>
      <Card className="myFlexContainer mh100">
        <AppBar position="relative" className="myFlexFitContentContainer">
          <Toolbar variant="dense">
            <Typography variant="h6" color="inherit" component="div">
              Projects
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              component={Link}
              to="/projectsettings"
            >
              Create
            </Button>
          </Toolbar>
        </AppBar>
        <CardContent sx={{ p: "0px !important" }} className="myFlexFillAllContainer">
          {projects.isSuccess ? (
            <List>
              {projects.data
                ?.sort((a, b) => a.id - b.id)
                .map((project) => (
                  <ListItem disablePadding key={project.id} onContextMenu={onContextMenu(project.id)}>
                    <ListItemButton
                      component={RouterLink}
                      to={`/projectsettings/${project.id}`}
                      selected={project.id.toString() === projectId}
                    >
                      <ListItemText primary={project.title} />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          ) : projects.isError ? (
            <div>Error: {projects.error.message}</div>
          ) : (
            <div>Loading!</div>
          )}
        </CardContent>
      </Card>
      <ProjectSelectionContextMenu
        projectId={contextMenuData}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
    </>
  );
}

export default ProjectSelection;
