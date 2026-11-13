import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { ProjectHooks } from "@core/project";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { TabContext } from "@mui/lab";
import TabPanel from "@mui/lab/TabPanel";
import { AppBar, Dialog, DialogContent, Tabs } from "@mui/material";
import Tab from "@mui/material/Tab";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { SyntheticEvent, useCallback, useState } from "react";
import { ProjectImport } from "./_components/project-import/ProjectImport";
import { ProjectCodes } from "./_components/ProjectCodes";
import { ProjectDangerZone } from "./_components/ProjectDangerZone";
import { ProjectDetails } from "./_components/ProjectDetails";
import { ProjectFeatures } from "./_components/project-features/ProjectFeatures";
import { ProjectTags } from "./_components/ProjectTags";
import { ProjectUsers } from "./_components/ProjectUsers";
import { ProjectVirtualUsers } from "./_components/ProjectVirtualUsers";
import { closeOnEscape } from "@utils/dialogUtils";

interface ProjectSettingsDialogProps {
  projectId: number;
  hiddenCodeIds: number[];
  onToggleCodeVisibility: (codeIds: number[]) => void;
}

export function ProjectSettingsDialog({
  projectId,
  hiddenCodeIds,
  onToggleCodeVisibility,
}: ProjectSettingsDialogProps) {
  // dialog state
  const { isOpen, data: dialogData, close: closeDialog } = useDialogBus("projectSettings");

  // queries
  const project = ProjectHooks.useGetProject(projectId);

  // state: the tab chosen in the dialog, else the tab it was opened on
  const [chosenTab, setChosenTab] = useState<string | null>(null);
  const tab = chosenTab ?? dialogData?.tab ?? "1";
  const handleChangeTab = useCallback((_event: SyntheticEvent, newValue: string) => {
    setChosenTab(newValue);
  }, []);
  // forget the chosen tab when the dialog closes, also when its content closed it (e.g. "Open Document Health")
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setChosenTab(null);
  }
  const handleClose = useCallback(() => closeDialog(), [closeDialog]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog
      open={isOpen}
      onClose={closeOnEscape(handleClose)}
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
            <Tab label="Virtual users" value="7" />
            <Tab label="Codes" value="3" />
            <Tab label="Tags" value="4" />
            <Tab label="Features" value="features" />
            <Tab label="Import" value="5" />
            <Tab label="Danger Zone" value="6" />
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
            <TabPanel value="7" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectVirtualUsers project={project.data} />
            </TabPanel>
            <TabPanel value="3" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectCodes hiddenCodeIds={hiddenCodeIds} onToggleCodeVisibility={onToggleCodeVisibility} />
            </TabPanel>
            <TabPanel value="4" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectTags />
            </TabPanel>
            <TabPanel value="features" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectFeatures project={project.data} />
            </TabPanel>
            <TabPanel value="5" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectImport project={project.data} />
            </TabPanel>
            <TabPanel value="6" sx={{ p: 0 }} className="myFlexFillAllContainer">
              <ProjectDangerZone project={project.data} />
            </TabPanel>
          </>
        )}
      </TabContext>
    </Dialog>
  );
}
