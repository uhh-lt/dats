import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import eventBus from "../../EventBus.ts";
import ExporterHooks from "../../api/ExporterHooks.ts";
import ProjectHooks from "../../api/ProjectHooks.ts";

import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportFormat } from "../../api/openapi/models/ExportFormat.ts";
import { ExportJobParameters } from "../../api/openapi/models/ExportJobParameters.ts";
import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { SingleDocAllUserAnnotationsExportJobParams } from "../../api/openapi/models/SingleDocAllUserAnnotationsExportJobParams.ts";
import { SingleDocSingleUserAnnotationsExportJobParams } from "../../api/openapi/models/SingleDocSingleUserAnnotationsExportJobParams.ts";
import { SingleProjectAllDataExportJobParams } from "../../api/openapi/models/SingleProjectAllDataExportJobParams.ts";
import { SingleProjectAllTagsExportJobParams } from "../../api/openapi/models/SingleProjectAllTagsExportJobParams.ts";
import { SingleUserAllCodesExportJobParams } from "../../api/openapi/models/SingleUserAllCodesExportJobParams.ts";
import { SingleUserAllMemosExportJobParams } from "../../api/openapi/models/SingleUserAllMemosExportJobParams.ts";
import { SingleUserLogbookExportJobParams } from "../../api/openapi/models/SingleUserLogbookExportJobParams.ts";
import { useAuth } from "../../auth/useAuth.ts";
import UserName from "../../components/User/UserName.tsx";
import SnackbarAPI from "../Snackbar/SnackbarAPI.ts";
import ExporterItemSelectList from "./ExporterItemSelectList.tsx";

// users documents codes tags attached_to
const enabledComponentsPerType = new Map<string, string[]>(
  Object.entries({
    Project: [],
    Tagset: [],
    Codeset: ["users"],
    Memos: ["users"],
    Logbook: ["users"],
    Annotations: ["singleUser"],
  }),
);
const componentIsDisabled = (type: string, component: string): boolean => {
  if (enabledComponentsPerType.has(type)) {
    return enabledComponentsPerType.get(type)!.indexOf(component) === -1;
  }
  return true;
};

// const attachObjects = [
//   { id: 0, name: "Document" },
//   { id: 1, name: "Code" },
//   { id: 2, name: "Tag" },
//   { id: 3, name: "Annotations" },
// ];

export interface ExporterInfo {
  type: "Project" | "Tagset" | "Codeset" | "Memos" | "Logbook" | "Annotations";
  users: number[];
  singleUser: boolean;
  sdocId: number;
}

const exporterInfoToExporterJobParameters = (exporterData: ExporterInfo, projectId: number): ExportJobParameters => {
  switch (exporterData.type) {
    case "Project":
      return {
        export_job_type: ExportJobType.SINGLE_PROJECT_ALL_DATA,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_ALL_DATA,
        } as SingleProjectAllDataExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Tagset":
      return {
        export_job_type: ExportJobType.SINGLE_PROJECT_ALL_TAGS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_ALL_TAGS,
        } as SingleProjectAllTagsExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Codeset":
      return {
        export_job_type: ExportJobType.SINGLE_USER_ALL_CODES,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_USER_ALL_CODES,
          user_id: exporterData.users[0],
        } as SingleUserAllCodesExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Memos":
      return {
        export_job_type: ExportJobType.SINGLE_USER_ALL_MEMOS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_USER_ALL_MEMOS,
          user_id: exporterData.users[0],
        } as SingleUserAllMemosExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Logbook":
      return {
        export_job_type: ExportJobType.SINGLE_USER_LOGBOOK,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_USER_LOGBOOK,
          user_id: exporterData.users[0],
        } as SingleUserLogbookExportJobParams,
        export_format: ExportFormat.CSV,
      };
    case "Annotations":
      if (exporterData.singleUser) {
        return {
          export_job_type: ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS,
          specific_export_job_parameters: {
            project_id: projectId,
            export_job_type: ExportJobType.SINGLE_DOC_SINGLE_USER_ANNOTATIONS,
            sdoc_id: exporterData.sdocId,
            user_id: exporterData.users[0],
          } as SingleDocSingleUserAnnotationsExportJobParams,
          export_format: ExportFormat.CSV,
        };
      } else {
        return {
          export_job_type: ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS,
          specific_export_job_parameters: {
            project_id: projectId,
            export_job_type: ExportJobType.SINGLE_DOC_ALL_USER_ANNOTATIONS,
            sdoc_id: exporterData.sdocId,
          } as SingleDocAllUserAnnotationsExportJobParams,
          export_format: ExportFormat.CSV,
        };
      }
  }
};

function ExporterDialog() {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // local state
  const [exportJobId, setExportJobId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [exporterData, setExporterData] = useState<ExporterInfo>({
    type: "Project",
    users: [],
    singleUser: false,
    sdocId: -1,
  });

  // mutations (react-query)
  const createJobMutation = ExporterHooks.useStartExportJob();

  const handleClick = () => {
    const requestBody = exporterInfoToExporterJobParameters(exporterData, projectId);
    createJobMutation.mutate(
      {
        requestBody,
      },
      {
        onSuccess: (exportJobRead) => {
          SnackbarAPI.openSnackbar({
            text: `Created new export job ${exportJobRead.id}`,
            severity: "success",
          });
          setExportJobId(exportJobRead.id);
        },
      },
    );
  };

  // global state (react-query)
  const exportJob = ExporterHooks.useGetExportJob(exportJobId);
  const { user } = useAuth();

  const projectUsers = ProjectHooks.useGetAllUsers(projectId);
  // const projectDocuments = ProjectHooks.useGetProjectDocumentsInfinite(projectId);
  // const projectTags = ProjectHooks.useGetAllTags(projectId);
  // const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);
  // const projectCodeTree = useMemo(
  //   () => (projectCodes.data ? codesToTree(projectCodes.data) : undefined),
  //   [projectCodes.data]
  // );

  // listen to open-memo event and open the dialog
  const openModal = useCallback(
    (event: CustomEventInit<ExporterInfo>) => {
      setOpen(true);
      const data = event.detail!;
      if (data.users.length !== 1 && user) {
        data.users = [user.id];
      }
      setExporterData(event.detail!);
    },
    [user],
  );

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        window.open(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url, "_blank");
        setExportJobId(undefined);
      } else if (exportJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
        SnackbarAPI.openSnackbar({
          text: `Export job ${exportJob.data.id} failed`,
          severity: "error",
        });
        setExportJobId(undefined);
      }
    }
  }, [exportJob.data]);

  useEffect(() => {
    eventBus.on("open-exporter", openModal);
    return () => {
      eventBus.remove("open-exporter", openModal);
    };
  }, [openModal]);

  const handleClose = () => {
    setOpen(false);
    // setExporterData(undefined);
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setExporterData((oldData) => {
      return {
        ...oldData,
        type: (event.target as HTMLInputElement).value as
          | "Project"
          | "Tagset"
          | "Codeset"
          | "Memos"
          | "Logbook"
          | "Annotations",
      };
    });
  };

  const handleUsersChange = (selectedItems: number[]) => {
    setExporterData((oldData) => {
      return { ...oldData, users: selectedItems };
    });
  };

  const handleToggleSingleUser = () => {
    setExporterData((oldData) => {
      return { ...oldData, singleUser: !oldData.singleUser };
    });
  };

  // const handleTagsChange = (selectedItems: number[]) => {
  //   setExporterData((oldData) => {
  //     return { ...oldData, tags: selectedItems };
  //   });
  // };

  // const handleCodesChange = (selectedItems: number[]) => {
  //   setExporterData((oldData) => {
  //     return { ...oldData, codes: selectedItems };
  //   });
  // };

  // const toggleAttachedTo = (selectedItem: number) => {
  //   setExporterData((oldData) => {
  //     const idx = oldData.attached_to.indexOf(selectedItem);
  //     if (idx === -1) {
  //       return { ...oldData, attached_to: [...oldData.attached_to, selectedItem] };
  //     }
  //     oldData.attached_to.splice(idx, 1);
  //     return { ...oldData, attached_to: oldData.attached_to };
  //   });
  // };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Export</DialogTitle>
      <DialogContent>
        <Accordion elevation={0} variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Type</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You want to export the {exporterData.type}
              {enabledComponentsPerType.get(exporterData.type)!.length > 0 ? "..." : "."}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <RadioGroup name="export-type-group" value={exporterData.type} onChange={handleTypeChange} row>
              {Array.from(enabledComponentsPerType.keys()).map((type) => (
                <FormControlLabel
                  key={type}
                  value={type}
                  control={<Radio />}
                  label={type}
                  disabled={type === "Annotations" && exporterData.sdocId === -1}
                />
              ))}
            </RadioGroup>
          </AccordionDetails>
        </Accordion>
        {!componentIsDisabled(exporterData.type, "users") && (
          <Accordion elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ width: "33%", flexShrink: 0 }}>User</Typography>
              <Typography sx={{ color: "text.secondary" }}>
                ... of {exporterData.users.length > 0 ? <UserName userId={exporterData.users[0]} /> : "no user"}.
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ExporterItemSelectList
                items={
                  projectUsers.data?.map((user) => {
                    return {
                      id: user.id,
                      description: `${user.first_name} ${user.last_name}`,
                    };
                  }) || []
                }
                value={exporterData.users}
                onChange={handleUsersChange}
                itemsPerPage={5}
                singleSelect={true}
              />
            </AccordionDetails>
          </Accordion>
        )}
        {!componentIsDisabled(exporterData.type, "singleUser") && (
          <Accordion elevation={0} variant="outlined">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ width: "33%", flexShrink: 0 }}>User</Typography>
              <Typography sx={{ color: "text.secondary" }}>
                ... of {exporterData.singleUser ? <UserName userId={exporterData.users[0]} /> : "all users"}.
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ToggleButtonGroup
                sx={{ ml: 2, mb: 1 }}
                color="primary"
                value={exporterData.singleUser}
                onClick={handleToggleSingleUser}
              >
                <ToggleButton value={true}>Single User</ToggleButton>
                <ToggleButton value={false}>All Users</ToggleButton>
              </ToggleButtonGroup>
              {exporterData.singleUser && (
                <ExporterItemSelectList
                  items={
                    projectUsers.data?.map((user) => {
                      return {
                        id: user.id,
                        description: `${user.first_name} ${user.last_name}`,
                      };
                    }) || []
                  }
                  value={exporterData.users}
                  onChange={handleUsersChange}
                  itemsPerPage={5}
                  singleSelect={true}
                />
              )}
            </AccordionDetails>
          </Accordion>
        )}

        {/* <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "documents")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Documents</Typography>
            <Typography sx={{ color: "text.secondary" }}>You selected 10/3456 documents.</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex, sit amet blandit
              leo lobortis eget.
            </Typography>
          </AccordionDetails>
        </Accordion> */}
        {/* <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "codes")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Codes</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You selected {exporterData.codes.length}/{projectCodes.data?.length || -1} codes.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExporterTreeSelect tree={projectCodeTree} value={exporterData.codes} onChange={handleCodesChange} />
          </AccordionDetails>
        </Accordion> */}
        {/* <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "tags")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Tags</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You selected {exporterData.tags.length}/{projectTags.data?.length || -1} tags.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExporterItemSelectList
              items={
                projectTags.data?.map((tag) => {
                  return { id: tag.id, description: `${tag.name}` };
                }) || []
              }
              value={exporterData.tags}
              onChange={handleTagsChange}
              itemsPerPage={5}
            />
          </AccordionDetails>
        </Accordion> */}
        {/* <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "attached_to")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Attached To</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You selected {exporterData.attached_to.length}/{attachObjects.length} objects.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FormControl component="fieldset" variant="standard" sx={{ mr: 3 }}>
              <FormGroup row>
                {attachObjects.map((obj) => (
                  <FormControlLabel
                    key={obj.id}
                    control={
                      <Checkbox
                        name={obj.name}
                        onChange={() => toggleAttachedTo(obj.id)}
                        checked={exporterData.attached_to.indexOf(obj.id) !== -1}
                        edge="end"
                      />
                    }
                    label={obj.name}
                  />
                ))}
              </FormGroup>
            </FormControl>
          </AccordionDetails>
        </Accordion> */}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <LoadingButton
          loading={exportJobId !== undefined}
          loadingPosition="start"
          startIcon={<SaveIcon />}
          variant="outlined"
          onClick={handleClick}
        >
          Export data!
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export default ExporterDialog;
