import {
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CircularProgress,
  Grid2,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { ProjectRead } from "../../api/openapi/models/ProjectRead.ts";
import { SDocStatus } from "../../api/openapi/models/SDocStatus.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";

interface ProjectCardProps {
  project: ProjectRead;
}
export function ProjectCard({ project }: ProjectCardProps) {
  const numFinishedSdocs = ProjectHooks.useCountSdocsWithStatus(project.id, SDocStatus._1);
  const numProcessingSdocs = ProjectHooks.useCountSdocsWithStatus(project.id, SDocStatus._0);

  const projectTabs = useAppSelector((state) => state.tabs.tabsByProject);

  // open project
  const navigate = useNavigate();
  const openProject = () => {
    if (!projectTabs[project.id] || projectTabs[project.id].activeTabIndex === null) {
      navigate(`/project/${project.id}/search`);
    } else {
      navigate(projectTabs[project.id].tabs[projectTabs[project.id].activeTabIndex!].path);
    }
  };

  return (
    <Grid2 size={{ sm: 3 }}>
      <Card>
        <CardActionArea onClick={openProject}>
          <CardContent
            sx={{ padding: "0px !important", bgcolor: "lightgray", p: 2, color: "textPrimary", height: 200 }}
          >
            <Typography variant="body2" height="50%">
              {project.description}
            </Typography>
            {numFinishedSdocs.isSuccess && (
              <Stack height="50%" spacing={2}>
                <Typography variant="body2">Number of documents: {numFinishedSdocs.data}</Typography>
                {numProcessingSdocs.isSuccess && numProcessingSdocs.data > 0 && (
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CircularProgress size={14} />
                    <Typography variant="body2">{numProcessingSdocs.data} document(s) are being processed</Typography>
                  </Stack>
                )}
              </Stack>
            )}
          </CardContent>
        </CardActionArea>
        <CardActions>
          <Typography variant="subtitle1" sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}>
            {project.title}
          </Typography>
        </CardActions>
      </Card>
    </Grid2>
  );
}
