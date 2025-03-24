import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Fab,
  FormControl,
  IconButton,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/CodeFrequencyHooks.ts";
import MLHooks from "../../../api/MLHooks.ts";
import { BackgroundJobStatus } from "../../../api/openapi/models/BackgroundJobStatus.ts";
import { MLJobRead } from "../../../api/openapi/models/MLJobRead.ts";
import { MLJobType } from "../../../api/openapi/models/MLJobType.ts";
import NoSidebarLayout from "../../../layouts/NoSidebarLayout.tsx";
import { TextInputId } from "./DocCatEnums.tsx";
import TopDocumentsBarChart from "./TopDocumentsBarChart.tsx";
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  const [currentTopic, setCurrentTopic] = useState(0);
  const [currentCarouselField, setCarouselField] = useState(0);
  const [height, setHeight] = useState<number>(window.innerHeight);
  const [currentJobId, setCurrentJobId] = useState<string | undefined>(undefined);

  // confirm dialog
  const [open, setOpen] = useState(false);

  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const top_words_data = AnalysisHooks.useReturnTopWordsData(projectId);
  const topic_distr_hook = AnalysisHooks.useReturnTopicDistrData(projectId);

  const topic_document_data = AnalysisHooks.useReturnTopicDocuments(projectId, currentTopic);
  const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic, projectId);

  const startMlJob = MLHooks.useStartMLJob();
  const pollMlJob = MLHooks.usePollMLJob(currentJobId, undefined);

  const diagramList = [
    <TopWordsBarChart topicNum={currentTopic} dataHook={top_words_data} />,
    <TopicDistrChart topicNum={currentTopic} dataHook={topic_distr_hook} />,
    <TopDocumentsBarChart topicNum={currentTopic} dataHook={topic_document_data} />,
  ];

  const [currentNrTopics, setNrTopics] = useState(5);
  const [currentMinTopicSize, setMinTopicSize] = useState(5);
  const [currentTopNWords, setTopNWords] = useState(5);

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopic(event.target.value as number);
  };

  const changeCarouselCard = (change: number) => {
    if (currentCarouselField + change < 0) {
      setCarouselField(diagramList.length - 1);
    } else {
      setCarouselField((currentCarouselField + change) % diagramList.length);
    }
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

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const boxHeight = window.innerHeight * 0.6;

  return (
    <NoSidebarLayout>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>
        </CardContent>
        <Box
          sx={{
            margin: "auto",
            padding: 2,
          }}
        >
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
                <Tooltip title="Performs topic modeling">
                  <IconButton
                    onClick={() => handleStartTopicModeling(false)}
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
                <React.Fragment>
                  <Tooltip title="Re-compute all documents by deleting all previous automatic quote annotations">
                    <IconButton
                      onClick={handleClickOpen}
                      loading={
                        startMlJob.isPending ||
                        pollMlJob.data?.status == BackgroundJobStatus.RUNNING ||
                        pollMlJob.data?.status == BackgroundJobStatus.WAITING
                      }
                      color="error"
                    >
                      <RestartAltIcon />
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
                        Remove all automatic quotation annotations including any manually created, linked data such as
                        memos?
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
          <FormControl fullWidth>
            <InputLabel id="dynamic-dropdown-label">Select Key</InputLabel>
            <Select labelId="dynamic-dropdown-label" value={currentTopic || ""} onChange={handleChange}>
              {top_words_data.isLoading && <MenuItem disabled>Loading...</MenuItem>}

              {top_words_data.isSuccess && Object.keys(top_words_data.data).length > 0 ? (
                Object.keys(top_words_data.data).map((key) => (
                  <MenuItem key={key} value={key}>
                    {key}
                  </MenuItem>
                ))
              ) : (
                <MenuItem disabled>No options available</MenuItem>
              )}
            </Select>
          </FormControl>
          <Box
            sx={{
              margin: "auto",
              padding: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: boxHeight,
            }}
          >
            <Fab color="primary" size="small" onClick={() => changeCarouselCard(-1)}>
              <ArrowLeftIcon />
            </Fab>
            {diagramList[currentCarouselField].props.dataHook.isLoading && <div>Loading...</div>}
            {diagramList[currentCarouselField].props.dataHook.isSuccess ? (
              diagramList[currentCarouselField]
            ) : (
              <div></div>
            )}
            <Fab color="primary" size="small" onClick={() => changeCarouselCard(1)}>
              <ArrowRightIcon />
            </Fab>
          </Box>
          <Box
            sx={{
              margin: "auto",
              padding: 2,
            }}
          >
            {ollamaResponse.isLoading && <div style={{ textAlign: "center" }}>Loading...</div>}
            {ollamaResponse.isSuccess ? (
              <Box
                sx={{
                  margin: "auto",
                  padding: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ whiteSpace: "pre-line", height: height * 0.2 }}>
                  {ollamaResponse.data["reasoning"] as string}
                </div>
              </Box>
            ) : (
              <div></div>
            )}
          </Box>
        </Box>
      </Card>
    </NoSidebarLayout>
  );
}
export default DocumentCategorization;
