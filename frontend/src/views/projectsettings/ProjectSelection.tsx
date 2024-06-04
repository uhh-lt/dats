import AddIcon from "@mui/icons-material/Add";
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
import { Link, Link as RouterLink, useParams } from "react-router-dom";
import UserHooks from "../../api/UserHooks.ts";
import { useAuth } from "../../auth/useAuth.ts";

function ProjectSelection() {
  const { user } = useAuth();

  // react router
  const { projectId } = useParams() as { projectId: string };

  // global server state (react query)
  const projects = UserHooks.useGetProjects(user?.id);

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
    </>
  );
}

export default ProjectSelection;
