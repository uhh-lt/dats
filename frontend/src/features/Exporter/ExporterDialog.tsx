import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import eventBus from "../../EventBus";
import { codesToTree } from "../../views/annotation/CodeExplorer/TreeUtils";
import { ExporterEvent } from "./ExporterAPI";
import ExporterTreeSelect from "./ExporterTreeSelect";
import ExporterItemSelectList from "./ExporterItemSelectList";

// users documents codes tags attached_to
const enabledComponentsPerType = new Map<string, string[]>(
  Object.entries({
    Memo: ["users", "attached_to"],
    Tag: ["users", "documents", "tags"],
    Annotation: ["users", "documents", "codes"],
    Tagset: ["users"],
    Codeset: ["users"],
    Logbook: ["users"],
  })
);
const componentIsDisabled = (type: string, component: string): boolean => {
  if (enabledComponentsPerType.has(type)) {
    return enabledComponentsPerType.get(type)!.indexOf(component) === -1;
  }
  return true;
};

const attachObjects = [
  { id: 0, name: "Document" },
  { id: 1, name: "Code" },
  { id: 2, name: "Tag" },
  { id: 3, name: "Annotation" },
];

interface ExporterInfo {
  type: string;
  users: number[];
  documents: number[];
  codes: number[];
  tags: number[];
  attached_to: number[];
}

interface ExporterProps {}
function ExporterDialog({}: ExporterProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // local state
  const [open, setOpen] = useState(false);
  const [exporterData, setExporterData] = useState<ExporterInfo>({
    type: "Memo",
    users: [],
    documents: [],
    codes: [],
    tags: [],
    attached_to: [],
  });

  // global state (react-query)
  const projectUsers = ProjectHooks.useGetAllUsers(projectId);
  const projectDocuments = ProjectHooks.useGetProjectDocumentsInfinite(projectId);
  const projectTags = ProjectHooks.useGetAllTags(projectId);
  const projectCodes = ProjectHooks.useGetAllCodes(projectId, true);
  const projectCodeTree = useMemo(
    () => (projectCodes.data ? codesToTree(projectCodes.data) : undefined),
    [projectCodes.data]
  );

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit<ExporterEvent>) => {
    setOpen(true);
    // setExporterData(event.detail);
  }, []);

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
      return { ...oldData, type: (event.target as HTMLInputElement).value };
    });
  };

  const handleUsersChange = (selectedItems: number[]) => {
    setExporterData((oldData) => {
      return { ...oldData, users: selectedItems };
    });
  };

  const handleTagsChange = (selectedItems: number[]) => {
    setExporterData((oldData) => {
      return { ...oldData, tags: selectedItems };
    });
  };

  const handleCodesChange = (selectedItems: number[]) => {
    setExporterData((oldData) => {
      return { ...oldData, codes: selectedItems };
    });
  };

  const toggleAttachedTo = (selectedItem: number) => {
    setExporterData((oldData) => {
      const idx = oldData.attached_to.indexOf(selectedItem);
      if (idx === -1) {
        return { ...oldData, attached_to: [...oldData.attached_to, selectedItem] };
      }
      oldData.attached_to.splice(idx, 1);
      return { ...oldData, attached_to: oldData.attached_to };
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Export</DialogTitle>
      <DialogContent>
        <Accordion elevation={0} variant="outlined">
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Type</Typography>
            <Typography sx={{ color: "text.secondary" }}>You want to export {exporterData.type}.</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <RadioGroup name="export-type-group" value={exporterData.type} onChange={handleTypeChange} row>
              {Array.from(enabledComponentsPerType.keys()).map((type) => (
                <FormControlLabel key={type} value={type} control={<Radio />} label={type} />
              ))}
            </RadioGroup>
          </AccordionDetails>
        </Accordion>
        <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "users")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>User</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You selected {exporterData.users.length}/{projectUsers.data?.length || -1} users.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExporterItemSelectList
              items={
                projectUsers.data?.map((user) => {
                  return { id: user.id, description: `${user.first_name} ${user.last_name}` };
                }) || []
              }
              value={exporterData.users}
              onChange={handleUsersChange}
              itemsPerPage={5}
            />
          </AccordionDetails>
        </Accordion>
        <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "documents")}>
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
        </Accordion>
        <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "codes")}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ width: "33%", flexShrink: 0 }}>Codes</Typography>
            <Typography sx={{ color: "text.secondary" }}>
              You selected {exporterData.codes.length}/{projectCodes.data?.length || -1} codes.
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ExporterTreeSelect tree={projectCodeTree} value={exporterData.codes} onChange={handleCodesChange} />
          </AccordionDetails>
        </Accordion>
        <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "tags")}>
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
                  return { id: tag.id, description: `${tag.title}` };
                }) || []
              }
              value={exporterData.tags}
              onChange={handleTagsChange}
              itemsPerPage={5}
            />
          </AccordionDetails>
        </Accordion>
        <Accordion elevation={0} variant="outlined" disabled={componentIsDisabled(exporterData.type, "attached_to")}>
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
        </Accordion>
        <Divider>Summary</Divider>
        <DialogContentText>
          You are going to export {exporterData.type} with {exporterData.users.length} users, 10 documents, 25 codes,
          10...
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default ExporterDialog;
