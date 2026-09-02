import { userProjectsQueryOptions } from "@api/hooks/ProjectHooks";
import { Box, Card, CardActionArea, CardContent, Container, Grid2, Typography } from "@mui/material";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ProjectCard } from "./_components/ProjectCard";
import { ProjectCreationDialog } from "./_components/ProjectCreationDialog";

export function ProjectsView() {
  const queryClient = useQueryClient();
  const { data: projects } = useSuspenseQuery(userProjectsQueryOptions());
  const [isOpen, setIsOpen] = useState(false);

  // webSocket listener
  useEffect(() => {
    const token = localStorage.getItem("dats-access");
    if (!token) return;
    const wsUrl = `ws://localhost:10120/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "auth", token: token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);
        if (typeof data.type === "string" && data.type.startsWith("PROJECT_")) {
          console.log(`Received ${data.type}, refreshing projects...`);
          // invalidate cache for user projects query to trigger a refetch
          queryClient.invalidateQueries({
            queryKey: userProjectsQueryOptions().queryKey,
          });
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };
    return () => ws.close();
  }, [queryClient]);

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
          </Grid2>
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Grid2>
      </Container>
      <ProjectCreationDialog open={isOpen} onClose={() => setIsOpen(false)} />
    </Box>
  );
}
