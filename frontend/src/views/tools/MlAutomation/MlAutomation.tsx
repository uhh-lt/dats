import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import SwitchAccessShortcutAddIcon from "@mui/icons-material/SwitchAccessShortcutAdd";
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { useParams } from "react-router-dom";
import JobHooks from "../../../api/JobHooks.ts";
import { MLJobType } from "../../../api/openapi/models/MLJobType.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import ContentContainerLayout from "../../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import MLJobsView from "./MLJobsView.tsx";

function MlAutomation() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // actions
  const startMlJob = JobHooks.useStartMLJob();

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
        ml_job_type: MLJobType.TAG_RECOMMENDATION,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.TAG_RECOMMENDATION },
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

  // document embedding job
  const handleStartNewDocumentEmbeddings = () => {
    startMlJob.mutate({
      requestBody: {
        ml_job_type: MLJobType.DOCUMENT_EMBEDDING,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.DOCUMENT_EMBEDDING },
      },
    });
  };

  const handleStartReComputeDocumentEmbeddings = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: "Remove all document embeddings from the index and compute new embeddings?",
      onAccept: () => {
        startMlJob.mutate({
          requestBody: {
            ml_job_type: MLJobType.DOCUMENT_EMBEDDING,
            project_id: projectId,
            specific_ml_job_parameters: { recompute: true, ml_job_type: MLJobType.DOCUMENT_EMBEDDING },
          },
        });
      },
    });
  };

  // document embedding job
  const handleStartNewSentenceEmbeddings = () => {
    startMlJob.mutate({
      requestBody: {
        ml_job_type: MLJobType.SENTENCE_EMBEDDING,
        project_id: projectId,
        specific_ml_job_parameters: { recompute: false, ml_job_type: MLJobType.SENTENCE_EMBEDDING },
      },
    });
  };

  const handleStartReComputeSentenceEmbeddings = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: "Remove all document embeddings from the index and compute new embeddings?",
      onAccept: () => {
        startMlJob.mutate({
          requestBody: {
            ml_job_type: MLJobType.SENTENCE_EMBEDDING,
            project_id: projectId,
            specific_ml_job_parameters: { recompute: true, ml_job_type: MLJobType.SENTENCE_EMBEDDING },
          },
        });
      },
    });
  };

  return (
    <ContentContainerLayout>
      <Card sx={{ minHeight: "540px", mb: 2 }} variant="outlined" className="myFlexFillAllContainer myFlexContainer">
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
                <Tooltip title="Perform tag recommendation on untagged documents">
                  <IconButton onClick={handleStartNewTagRecommendation} loading={startMlJob.isPending} color="success">
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>
            </ListItem>
          </List>
          <List dense={false}>
            <ListItem>
              <ListItemAvatar>
                <Avatar>{getIconComponent(Icon.DOCUMENT)}</Avatar>
              </ListItemAvatar>
              <ListItemText primary="Document Embeddings" secondary="Compute document embeddings" />
              <ListItemIcon>
                <Tooltip title="Compute embeddings for all unprocessed documents">
                  <IconButton onClick={handleStartNewDocumentEmbeddings} loading={startMlJob.isPending} color="success">
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Re-compute embeddings for all documents">
                  <IconButton
                    onClick={handleStartReComputeDocumentEmbeddings}
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
                <Avatar>{getIconComponent(Icon.SENTENCE_SEARCH)}</Avatar>
              </ListItemAvatar>
              <ListItemText primary="Sentence Embeddings" secondary="Compute sentence embeddings" />
              <ListItemIcon>
                <Tooltip title="Compute sentence embeddings for all unprocessed documents">
                  <IconButton onClick={handleStartNewSentenceEmbeddings} loading={startMlJob.isPending} color="success">
                    <NotStartedIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Re-compute sentence embeddings for all documents">
                  <IconButton
                    onClick={handleStartReComputeSentenceEmbeddings}
                    loading={startMlJob.isPending}
                    color="error"
                  >
                    <RestartAltIcon />
                  </IconButton>
                </Tooltip>
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
