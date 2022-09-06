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
import React from "react";
import { Link, Link as RouterLink, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import UserHooks from "../../api/UserHooks";

function ProjectSelection() {
  const { user } = useAuth();

  // react router
  const { projectId } = useParams() as { projectId: string };

  // global server state (react query)
  const projects = UserHooks.useGetProjects(user.data?.id);

  return (
    <Card className="myFlexContainer mh100">
      <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
        <Toolbar variant="dense">
          <Typography variant="h6" color="inherit" component="div">
            Projects
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/projectsettings">
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
                <ListItem disablePadding key={project.id}>
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
  );
}

export default ProjectSelection;
