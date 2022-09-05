import React from "react";
import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  Container,
  Grid,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { Link } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";

function Projects() {
  const projects = ProjectHooks.useGetAllProjects();

  return (
    <Container maxWidth="xl">
      <Toolbar sx={{ p: "0px !important" }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          All Projects
          {/*All Projects {user.data && `of ${user.data.email}`}*/}
        </Typography>
      </Toolbar>
      {projects.isLoading && <div>Loading!</div>}
      {projects.isError && <div>Error: {projects.error.message}</div>}
      {projects.isSuccess && (
        <Grid container spacing={2}>
          <Grid item>
            <Card
              sx={{
                width: 420,
                border: "3px dashed lightgray",
                boxShadow: 0,
              }}
            >
              <CardActionArea component={Link} to="/projectsettings">
                <CardContent
                  sx={{
                    height: 250,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h5" fontWeight={700} color="text.secondary" mb={5}>
                    CREATE NEW PROJECT
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
          {projects.data.map((project) => (
            <Grid item key={project.id}>
              <Card sx={{ width: 420 }}>
                <CardActionArea component={Link} to={`/project/${project.id}/search`}>
                  <CardContent sx={{ padding: "0px !important" }}>
                    <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={200}>
                      {project.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
                <CardActions>
                  <Typography variant="subtitle1" component="div" sx={{ flexGrow: 1 }}>
                    {project.title}
                  </Typography>
                  <Tooltip title={"Project settings"}>
                    <span>
                      <IconButton color="inherit" component={Link} to={`/projectsettings/${project.id}`}>
                        <EditIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}

export default Projects;
