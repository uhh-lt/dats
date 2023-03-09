import React, { useState } from "react";
import { AppBar, Box, Button, Card, CardContent, Tabs, Toolbar, Typography } from "@mui/material";
import Tab from "@mui/material/Tab";
import TabPanel from "@mui/lab/TabPanel";
import { LoadingButton, TabContext } from "@mui/lab";
import ProjectDocuments from "./ProjectDocuments";
import ProjectUsers from "./ProjectUsers";
import ProjectCodes from "./ProjectCodes";
import DeleteIcon from "@mui/icons-material/Delete";
import { Link, useNavigate, useParams } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import ProjectDetails from "./ProjectDetails";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import ProjectHooks from "../../../api/ProjectHooks";
import { useAuth } from "../../../auth/AuthProvider";

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
    if (project.data && user.data) {
      deleteProjectMutation.mutate(
        { projId: project.data.id, userId: user.data.id },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: "Successfully Deleted Project " + data.title + " with id " + data.id + "!",
              severity: "success",
            });
            navigate(`/projectsettings`);
          },
        }
      );
    }
  };

  return (
    <Card className="myFlexContainer mh100">
      <TabContext value={tab}>
        <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
          <Toolbar variant="dense" sx={{ flexDirection: "column", alignItems: "flex-start" }} disableGutters>
            <Toolbar variant="dense" sx={{ width: "100%" }}>
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
              <Button variant="contained" startIcon={<CloseIcon />} component={Link} to="/projects">
                Close
              </Button>
            </Toolbar>
            <Tabs
              value={tab}
              onChange={handleChangeTab}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="scrollable auto tabs example"
              textColor="inherit"
            >
              <Tab label="Details" value="1" />
              <Tab label="Documents" value="2" />
              <Tab label="User" value="3" />
              <Tab label="Codes" value="4" />
            </Tabs>
          </Toolbar>
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
          </React.Fragment>
        )}
      </TabContext>
    </Card>
  );
}

export default ProjectUpdate;
