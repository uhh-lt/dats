import { TabContext } from "@mui/lab";
import TabPanel from "@mui/lab/TabPanel";
import { AppBar, Dialog, DialogContent, Tabs } from "@mui/material";
import Tab from "@mui/material/Tab";
import React, { memo, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks.ts";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";
import DATSDialogHeader from "../MUI/DATSDialogHeader.tsx";
import ProjectCodes from "./tabs/ProjectCodes.tsx";
import ProjectDangerZone from "./tabs/ProjectDangerZone.tsx";
import ProjectDetails from "./tabs/ProjectDetails.tsx";
import ProjectImport from "./tabs/ProjectImport.tsx";
import ProjectTags from "./tabs/ProjectTags.tsx";
import ProjectUsers from "./tabs/ProjectUsers.tsx";

function ProjectSettingsDialog() {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // dialog state
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.dialog.isProjectSettingsOpen);
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeProjectSettings());
  }, [dispatch]);

  // queries
  const project = ProjectHooks.useGetProject(projId);

  // state
  const [tab, setTab] = useState("1");
  const handleChangeTab = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  }, []);

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
            <Tab label="Danger Zone" value="6" />
          </Tabs>
        </AppBar>
        {project.isLoading && <DialogContent>Loading project...</DialogContent>}
        {project.isError && <DialogContent>An error occurred while loading project {projectId}...</DialogContent>}
        {project.isSuccess && (
          <React.Fragment>
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
            <TabPanel value="6" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDangerZone project={project.data} />
            </TabPanel>
          </React.Fragment>
        )}
      </TabContext>
    </Dialog>
  );
}

export default memo(ProjectSettingsDialog);
