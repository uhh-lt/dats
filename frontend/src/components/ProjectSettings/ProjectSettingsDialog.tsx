import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton, TabContext } from "@mui/lab";
import TabPanel from "@mui/lab/TabPanel";
import { AppBar, Box, Dialog, DialogActions, DialogContent, Divider, Tabs } from "@mui/material";
import Tab from "@mui/material/Tab";
import { useNavigate } from "@tanstack/react-router";
import { SyntheticEvent, memo, useCallback, useState } from "react";
import { ProjectHooks } from "../../api/ProjectHooks.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../store/dialogSlice.ts";
import { ConfirmationAPI } from "../ConfirmationDialog/ConfirmationAPI.ts";
import { DATSDialogHeader } from "../MUI/DATSDialogHeader.tsx";
import { ProjectCodes } from "./tabs/ProjectCodes.tsx";
import { ProjectDetails } from "./tabs/ProjectDetails.tsx";
import { ProjectImport } from "./tabs/ProjectImport.tsx";
import { ProjectTags } from "./tabs/ProjectTags.tsx";
import { ProjectUsers } from "./tabs/ProjectUsers.tsx";

export const ProjectSettingsDialog = memo(({ projectId }: { projectId: number }) => {
  // dialog state
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.dialog.isProjectSettingsOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeProjectSettings());
  }, [dispatch]);

  // queries
  const project = ProjectHooks.useGetProject(projectId);

  // state
  const [tab, setTab] = useState("1");
  const handleChangeTab = useCallback((_event: SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

  const navigate = useNavigate();
  const { mutate: deleteProject, isPending } = ProjectHooks.useDeleteProject();
  const handleClickRemoveProject = useCallback(() => {
    if (project.data) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the project "${project.data.title}"? This action cannot be undone and  will remove project and all of it's content including documents!`,
        onAccept: () => {
          deleteProject(
            { projId: project.data.id },
            {
              onSuccess: () => navigate({ to: "/projects" }),
            },
          );
        },
      });
    }
  }, [project.data, deleteProject, navigate]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog
      open={isOpen}
      onClose={(_, reason) => reason === "escapeKeyDown" && handleClose()}
      maxWidth="xl"
      fullWidth
      slotProps={{
        paper: {
          className: "h100 myFlexFillAllContainer",
        },
      }}
      fullScreen={isMaximized}
    >
      <TabContext value={tab}>
        <AppBar position="relative" color="primary" className="myFlexFitContentContainer">
          <DATSDialogHeader
            title={(project.isSuccess ? project.data.title : "Project name") + " - Settings"}
            onClose={handleClose}
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
          />

          <Tabs value={tab} onChange={handleChangeTab} variant="scrollable" textColor="inherit">
            <Tab label="Details" value="1" />
            <Tab label="User" value="2" />
            <Tab label="Codes" value="3" />
            <Tab label="Tags" value="4" />
            <Tab label="Import" value="5" />
          </Tabs>
        </AppBar>
        {project.isLoading && <DialogContent>Loading project...</DialogContent>}
        {project.isError && <DialogContent>An error occurred while loading project {projectId}...</DialogContent>}
        {project.isSuccess && (
          <>
            <TabPanel value="1" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDetails project={project.data} />
            </TabPanel>
            <TabPanel value="2" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectUsers project={project.data} />
            </TabPanel>
            <TabPanel value="3" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectCodes />
            </TabPanel>
            <TabPanel value="4" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectTags />
            </TabPanel>
            <TabPanel value="5" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectImport project={project.data} />
            </TabPanel>
          </>
        )}
        <Divider />
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ mr: 1 }}
            onClick={handleClickRemoveProject}
            disabled={!project.isSuccess}
            loading={isPending}
            loadingPosition="start"
          >
            Delete Project
          </LoadingButton>
          <Box sx={{ flexGrow: 1 }} />
        </DialogActions>
      </TabContext>
    </Dialog>
  );
});
