import EditIcon from "@mui/icons-material/Edit";
import {
  Box,
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
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { Link } from "react-router-dom";
import PreProHooks from "../../api/PreProHooks.ts";
import UserHooks from "../../api/UserHooks.ts";
import { ProjectRead } from "../../api/openapi/models/ProjectRead.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition.ts";
import ProjectContextMenu from "./ProjectContextMenu.tsx";
import RecentActivity from "./RecentActivity.tsx";

function Projects() {
  const { user } = useAuth();
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
    <Box sx={{ height: "100%", overflowY: "auto", pb: 2 }}>
      <Container maxWidth="xl">
        {projects.isLoading && <div>Loading!</div>}
        {projects.isError && <div>Error: {projects.error.message}</div>}
        {projects.isSuccess && (
          <>
            <Grid container spacing={2}>
              <Grid item sm={9}>
                <Toolbar sx={{ p: "0px !important" }}>
                  <Typography variant="h6">
                    All Projects
                    {/*All Projects {user.data && `of ${user.data.email}`}*/}
                  </Typography>
                </Toolbar>

                <Grid container spacing={2}>
                  <Grid item sm={4}>
                    <Card
                      sx={{
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
                    <ProjectCard key={project.id} project={project} onContextMenu={onContextMenu}></ProjectCard>
                  ))}
                </Grid>
              </Grid>

              <Grid item sm={3}>
                <RecentActivity />
              </Grid>
            </Grid>

            <ProjectContextMenu
              projectId={contextMenuData}
              position={contextMenuPosition}
              handleClose={() => setContextMenuPosition(null)}
            />
          </>
        )}
      </Container>
    </Box>
  );
}

interface ProjectCardProps {
  project: ProjectRead;
  onContextMenu: (projectId: number) => (event: React.MouseEvent) => void;
}

function ProjectCard({ project, onContextMenu }: ProjectCardProps) {
  const preProStatus = PreProHooks.useGetPreProProjectStatus(project.id);
  return (
    <Grid item sm={4}>
      <Card onContextMenu={onContextMenu(project.id)}>
        <CardActionArea component={Link} to={`/project/${project.id}/search`}>
          <CardContent sx={{ padding: "0px !important" }}>
            <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={100}>
              {project.description}
            </Typography>
          </CardContent>
          {preProStatus.isSuccess && (
            <CardContent sx={{ padding: "0px !important" }}>
              <Typography variant="body2" color="text.primary" bgcolor="lightgray" p={2} height={100}>
                Number of Documents: {preProStatus.data.num_sdocs_finished}
                <br />
                {preProStatus.data.num_active_prepro_job_payloads > 0 && (
                  <>
                    {preProStatus.data.num_active_prepro_job_payloads} Document(s) are preprocessing{" "}
                    <CircularProgress />
                  </>
                )}
              </Typography>
            </CardContent>
          )}
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
    </Grid>
  );
}

export default Projects;
