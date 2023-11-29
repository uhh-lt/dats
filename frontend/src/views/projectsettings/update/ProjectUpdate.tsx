import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton, TabContext } from "@mui/lab";
import TabPanel from "@mui/lab/TabPanel";
import { AppBar, Box, Button, Card, CardContent, Stack, Tabs, Typography } from "@mui/material";
import Tab from "@mui/material/Tab";
import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import { useAuth } from "../../../auth/AuthProvider";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import ProjectCodes from "./ProjectCodes";
import ProjectDetails from "./ProjectDetails";
import ProjectDocuments from "./ProjectDocuments";
import ProjectTags from "./ProjectTags";
import ProjectUsers from "./ProjectUsers";
import ProjectBackgroundTasks from "./backgroundtasks/ProjectBackgroundTasks";
import ConfirmationAPI from "../../../features/ConfirmationDialog/ConfirmationAPI";
import ProjectMetadata from "./ProjectMetadata";

function ProjectUpdate() {
  const { user } = useAuth();
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // queries
  const project = ProjectHooks.useGetProject(projId);

  // state
  const [tab, setTab] = useState("1");
  const handleChangeTab = (event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  const navigate = useNavigate();
  const deleteProjectMutation = ProjectHooks.useDeleteProject();
  const handleClickRemoveProject = () => {
    if (project.data && user) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the project ${project.data.title}? This action cannot be undone and  will remove project and all of it's content including documents!`,
        onAccept: () => {
          deleteProjectMutation.mutate(
            { projId: project.data.id, userId: user.id },
            {
              onSuccess: (data) => {
                SnackbarAPI.openSnackbar({
                  text: "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
                  severity: "success",
                });
                navigate(`/projectsettings`);
              },
            },
          );
        },
      });
    }
  };

  return (
    <Card className="myFlexContainer h100">
      <TabContext value={tab}>
        <AppBar position="relative" color="primary" className="myFlexFitContentContainer">
          <Stack direction="row" sx={{ px: 2, pt: 2 }}>
            <Typography variant="h6" color="inherit" component="div">
              {project.isSuccess ? project.data.title : "Project name"}
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <LoadingButton
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              sx={{ mr: 1 }}
              onClick={handleClickRemoveProject}
              disabled={!project.isSuccess}
              loading={deleteProjectMutation.isLoading}
              loadingPosition="start"
            >
              Delete
            </LoadingButton>
            <Button variant="contained" color="secondary" startIcon={<CloseIcon />} component={Link} to="/projects">
              Close
            </Button>
          </Stack>
          <Tabs value={tab} onChange={handleChangeTab} variant="scrollable" textColor="inherit">
            <Tab label="Details" value="1" />
            <Tab label="Documents" value="2" />
            <Tab label="User" value="3" />
            <Tab label="Codes" value="4" />
            <Tab label="Tags" value="5" />
            <Tab label="Metadata" value="6" />
            <Tab label="Background Tasks" value="7" />
          </Tabs>
        </AppBar>
        {project.isLoading && <CardContent>Loading project...</CardContent>}
        {project.isError && <CardContent>An error occurred while loading project {projectId}...</CardContent>}
        {project.isSuccess && (
          <React.Fragment>
            <TabPanel value="1" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDetails project={project.data} />
            </TabPanel>
            <TabPanel value="2" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDocuments project={project.data} />
            </TabPanel>
            <TabPanel value="3" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectUsers project={project.data} />
            </TabPanel>
            <TabPanel value="4" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectCodes project={project.data} />
            </TabPanel>
            <TabPanel value="5" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectTags project={project.data} />
            </TabPanel>
            <TabPanel value="6" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectMetadata project={project.data} />
            </TabPanel>
            <TabPanel value="7" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectBackgroundTasks project={project.data} />
            </TabPanel>
          </React.Fragment>
        )}
      </TabContext>
    </Card>
  );
}

export default ProjectUpdate;
