import { Box, Container, Grid2, Typography } from "@mui/material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ProjectCard } from "./_components/ProjectCard";
import { ProjectCreationDialog } from "./_components/ProjectCreationDialog";

const routeApi = getRouteApi("/_auth/projects");

export function ProjectsView() {
  const { userProjectsOptions } = routeApi.useRouteContext();
  const { data: projects } = useSuspenseQuery(userProjectsOptions);

  return (
    <Box sx={{ height: "100%", overflowY: "auto", pb: 2 }}>
      <Container maxWidth="xl">
        <Grid2 container spacing={2} size={{ sm: 12 }}>
          <Grid2 size={{ sm: 12 }}>
            <Typography variant="h6" mt={2}>
              All Projects
            </Typography>
          </Grid2>
          <Grid2 size={{ sm: 3 }}>
            <ProjectCreationDialog />
          </Grid2>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Grid2>
      </Container>
    </Box>
  );
}
