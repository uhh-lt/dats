import React, { useState } from "react";
import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { Link } from "react-router-dom";
import UserHooks from "../../api/UserHooks";
import PreProHooks from "../../api/PreProHooks";
import { useAuth } from "../../auth/AuthProvider";
import ProjectContextMenu2, { ContextMenuPosition } from "./ProjectContextMenu2";
import { ProjectRead } from "../../api/openapi";

function Projects() {
  const { user } = useAuth();
  const projects = UserHooks.useGetProjects(user.data?.id);

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<number>();
  const onContextMenu = (projectId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(projectId);
  };

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
        <>
          <Grid container spacing={2}>
            <Grid item>
              <Card
                sx={{
                  width: 420,
                  border: "3px dashed lightgray",
                  boxShadow: 0
                }}
              >
                <CardActionArea component={Link} to="/projectsettings">
                  <CardContent
                    sx={{
                      height: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Typography variant="h5" fontWeight={700} color="text.secondary" mb={5}>
                      CREATE NEW PROJECT
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
            {projects.data.map((project) => <ProjectCard key={project.id} project={project} onContextMenu={onContextMenu}></ProjectCard>)}
          </Grid>
          <ProjectContextMenu2
            projectId={contextMenuData}
            position={contextMenuPosition}
            handleClose={() => setContextMenuPosition(null)}
          />
        </>
      )}
    </Container>
  );
}

interface ProjectCardProps {
  project: ProjectRead,
  onContextMenu: any
}

function ProjectCard({ project, onContextMenu }: ProjectCardProps) {
  const preProStatus = PreProHooks.useGetPreProProjectStatus(project.id);
  return (
    <Grid item>
      <Card sx={{ width: 420 }} onContextMenu={onContextMenu(project.id)}>
        <CardActionArea component={Link} to={`/project/${project.id}/search`}>
          <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={100}>
              {project.description}
            </Typography>
          </CardContent>
          {preProStatus.isSuccess && <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={100}>
              Number of preprocessed Documents: {preProStatus.data.num_sdocs_finished}
              <br />
              {preProStatus.data.in_progress && <>Document preprocessing is in progress </>}
              {preProStatus.data.in_progress && <>{preProStatus.data.num_sdocs_in_progress} <CircularProgress/></>}
            </Typography>
          </CardContent>}
        </CardActionArea>
        <CardActions>
          <Typography
            variant="subtitle1"
            component={Link}
            to={`/project/${project.id}/search`}
            sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
          >
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
    </Grid>)
}

export default Projects;
