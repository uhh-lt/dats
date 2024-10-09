import { Box, Card, CardActionArea, CardContent, Container, Grid, Toolbar, Typography } from "@mui/material";
import { useState } from "react";
import UserHooks from "../../api/UserHooks.ts";
import { ProjectCard } from "./ProjectCard.tsx";
import ProjectCreationDialog from "./ProjectCreationDialog.tsx";
import RecentActivity from "./RecentActivity.tsx";

function Projects() {
  const projects = UserHooks.useGetUserProjects();
  const [isOpen, setIsOpen] = useState(false);

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
                  <Typography variant="h6">All Projects</Typography>
                </Toolbar>

                <Grid container spacing={2}>
                  <Grid item sm={4}>
                    <Card
                      sx={{
                        border: "3px dashed lightgray",
                        boxShadow: 0,
                      }}
                    >
                      <CardActionArea onClick={() => setIsOpen(true)}>
                        <CardContent
                          sx={{
                            height: 240,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="h5" fontWeight={700} color="textSecondary" mb={5}>
                            CREATE NEW PROJECT
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                  {projects.data.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </Grid>
              </Grid>

              <Grid item sm={3}>
                <RecentActivity />
              </Grid>
            </Grid>
          </>
        )}
      </Container>
      <ProjectCreationDialog open={isOpen} onClose={() => setIsOpen(false)} />
    </Box>
  );
}

export default Projects;
