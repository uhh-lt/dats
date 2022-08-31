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
import ProjectHooks from "../../api/ProjectHooks";

function ProjectSelection() {
  const { projectId } = useParams<"projectId">();
  const projects = ProjectHooks.useGetAllProjects();

  let content: JSX.Element;
  if (projects.isLoading) {
    content = <div>Loading!</div>;
  } else if (projects.isError) {
    content = <div>Error: {projects.error.message}</div>;
  } else {
    content = (
      <List>
        {projects.data
          ?.sort((a, b) => a.id - b.id)
          .map((project) => (
            <ListItem
              disablePadding
              key={project.id}
              component={RouterLink}
              button
              to={`/projectsettings/${project.id}`}
              selected={project.id.toString() === projectId}
            >
              <ListItemButton>
                <ListItemText primary={project.title} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    );
  }

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
        {content}
      </CardContent>
    </Card>
  );
}

export default ProjectSelection;
