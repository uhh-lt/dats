import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SwitchAccessShortcutAddIcon from "@mui/icons-material/SwitchAccessShortcutAdd";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  TextField,
  Tooltip,
} from "@mui/material";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import MLHooks from "../../../api/MLHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { MLJobRead } from "../../../api/openapi/models/MLJobRead.ts";
import { MLJobType } from "../../../api/openapi/models/MLJobType.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import ContentContainerLayout from "../../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { TextInputId } from "../../analysis/DocumentCategorization/DocCatEnums.tsx";
import MLJobsView from "./MLJobsView.tsx";

function MlAutomation() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const [currentJobId, setCurrentJobId] = useState<string | undefined>(undefined);

  const [currentNrTopics, setNrTopics] = useState(5);
  const [currentMinTopicSize, setMinTopicSize] = useState(5);
  const [currentTopNWords, setTopNWords] = useState(5);

  // actions
  const startMlJob = MLHooks.useStartMLJob();
  const pollMlJob = MLHooks.usePollMLJob(currentJobId, undefined);

  // quotation detection jobs
  const handleStartNewQuotationDetection = () => {
    startMlJob.mutate({
      requestBody: {
        ml_job_type: MLJobType.QUOTATION_ATTRIBUTION,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.QUOTATION_ATTRIBUTION },
      },
    });
  };

  const handleStartReComputeQuotationDetection = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: "Remove all automatic quotation annotations including any manually created, linked data such as memos?",
      onAccept: () => {
        startMlJob.mutate({
          requestBody: {
            ml_job_type: MLJobType.QUOTATION_ATTRIBUTION,
            project_id: projectId,
            specific_ml_job_parameters: { recompute: true, ml_job_type: MLJobType.QUOTATION_ATTRIBUTION },
          },
        });
      },
    });
  };

  // document tagging jobs
  const handleStartNewTagRecommendation = () => {
    startMlJob.mutate({
      requestBody: {
        ml_job_type: MLJobType.DOC_TAG_RECOMMENDATION,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.DOC_TAG_RECOMMENDATION },
      },
    });
  };

  const handleTopicModelingStarted = (data: MLJobRead) => {
    setCurrentJobId(data.id);
  };

  const handleStartTopicModeling = (recompute: boolean = false) => {
    startMlJob.mutate(
      {
        requestBody: {
          ml_job_type: MLJobType.TOPIC_MODELING,
          project_id: projectId,
          specific_ml_job_parameters: {
            recompute: recompute,
            ml_job_type: MLJobType.TOPIC_MODELING,
            nr_topics: currentNrTopics,
            min_topic_size: currentMinTopicSize,
            top_n_words: currentTopNWords,
          },
        },
      },
      { onSuccess: handleTopicModelingStarted },
    );
  };

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTextInput = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, id: string) => {
    const value = event.target.value;

    if (!isNaN(Number(value)) || value === "") {
      switch (id) {
        case TextInputId.NrTopics:
          return setNrTopics(Number(value));
        case TextInputId.MinTopicSize:
          return setMinTopicSize(Number(value));
        case TextInputId.TopNWords:
          return setTopNWords(Number(value));
        default:
          return console.log("TextFieldId not Found!");
      }
    }
  };

  const handleStartReComputeTagRecommendation = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: "Remove all ...",
      onAccept: () => {
        startMlJob.mutate({
          requestBody: {
            ml_job_type: MLJobType.DOC_TAG_RECOMMENDATION,
            project_id: projectId,
            specific_ml_job_parameters: { recompute: true, ml_job_type: MLJobType.DOC_TAG_RECOMMENDATION },
          },
        });
      },
    });
  };

  // coreference resolution job
  const handleStartNewCoreferenceResolution = () => {
    startMlJob.mutate({
      requestBody: {
        ml_job_type: MLJobType.COREFERENCE_RESOLUTION,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.COREFERENCE_RESOLUTION },
      },
    });
  };

  const handleStartReComputeCoreferenceResolution = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: "Remove all automatic coreference annotations including any manually created, linked data such as memos?",
      onAccept: () => {
        startMlJob.mutate({
          requestBody: {
            ml_job_type: MLJobType.COREFERENCE_RESOLUTION,
            project_id: projectId,
            specific_ml_job_parameters: { recompute: true, ml_job_type: MLJobType.COREFERENCE_RESOLUTION },
          },
        });
      },
    });
  };

  return (
    <ContentContainerLayout>
      <Card sx={{ minHeight: "450px", mb: 2 }} variant="outlined" className="myFlexFillAllContainer myFlexContainer">
        <CardHeader
          title="ML Automations"
          subheader="Start one or more of the following machine learning automations to speed up your work an enable new analysis options"
        />
        <CardContent style={{ padding: 0 }}>
          <List dense={false}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <FormatQuoteIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Quotation detection"
                secondary={"Detect who says what to whom and create corresponding span annotations"}
              />
              <ListItemIcon>
                <Tooltip title="Perform quotation detection on all unprocessed documents">
                  <IconButton onClick={handleStartNewQuotationDetection} loading={startMlJob.isPending} color="success">
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Re-compute all documents by deleting all previous automatic quote annotations">
                  <IconButton
                    onClick={handleStartReComputeQuotationDetection}
                    loading={startMlJob.isPending}
                    color="error"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
            </ListItem>
          </List>
          <List dense={false}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <SwitchAccessShortcutAddIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Coreference resolution"
                secondary={
                  "Detect coreference relations between spans and create corresponding span annotations in German documents"
                }
              />
              <ListItemIcon>
                <Tooltip title="Perform coreference resolution on all unprocessed documents">
                  <IconButton
                    onClick={handleStartNewCoreferenceResolution}
                    loading={startMlJob.isPending}
                    color="success"
                  >
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Re-compute all documents by deleting all previous automatic coreference annotations">
                  <IconButton
                    onClick={handleStartReComputeCoreferenceResolution}
                    loading={startMlJob.isPending}
                    color="error"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
            </ListItem>
          </List>
          <List dense={false}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>{getIconComponent(Icon.TAG)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Document Tag Recommendations"
                secondary={
                  "Based on currently applied tags, recommend new tags for documents. Use the corresponding analysis feature to view recommendations."
                }
              />
              <ListItemIcon>
                <Tooltip title="Perform tag recommendation on all documents">
                  <IconButton onClick={handleStartNewTagRecommendation} loading={startMlJob.isPending} color="success">
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Perform tag recommendation on all documents">
                  <IconButton
                    onClick={handleStartReComputeTagRecommendation}
                    loading={startMlJob.isPending}
                    color="error"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
            </ListItem>
          </List>
          <List dense={false}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>
                  <FormatQuoteIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary="Topic Modeling with BERTopic"
                secondary={"Generates topics based on uploaded text data"}
              />
              <TextField
                id="nr_topics"
                label="Amount of Topics"
                type="number"
                onChange={(event) => handleTextInput(event, "nr_topics")}
              ></TextField>
              <TextField
                id="min_topic_size"
                label="Topic size"
                type="number"
                onChange={(event) => handleTextInput(event, "min_topic_size")}
              ></TextField>
              <TextField
                id="top_n_words"
                label="Amount of Words"
                type="number"
                onChange={(event) => handleTextInput(event, "top_n_words")}
              ></TextField>
              <ListItemIcon>
                <React.Fragment>
                  <Tooltip title="Deletes all Topics and generates new ones">
                    <IconButton
                      onClick={handleClickOpen}
                      loading={
                        startMlJob.isPending ||
                        pollMlJob.data?.status == BackgroundJobStatus.RUNNING ||
                        pollMlJob.data?.status == BackgroundJobStatus.WAITING
                      }
                      color="success"
                    >
                      <NotStartedIcon />
                    </IconButton>
                  </Tooltip>
                  <Dialog
                    open={open}
                    onClose={handleClose}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                  >
                    <DialogTitle id="alert-dialog-title">{"Potential dataloss ahead! Are you sure?"}</DialogTitle>
                    <DialogContent>
                      <DialogContentText id="alert-dialog-description">
                        Removes all generated topics and generates a new topic model
                      </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={handleClose} variant="outlined">
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          handleStartTopicModeling(true);
                          handleClose();
                        }}
                        color="error"
                        variant="contained"
                      >
                        Delete & re-compute
                      </Button>
                    </DialogActions>
                  </Dialog>
                </React.Fragment>
              </ListItemIcon>
            </ListItem>
          </List>
        </CardContent>
      </Card>
      <MLJobsView />
    </ContentContainerLayout>
  );
}

export default MlAutomation;
