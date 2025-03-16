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
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  const top_words_data = AnalysisHooks.useReturnTopWordsData();
  const topic_distr_hook = AnalysisHooks.useReturnTopicDistrData();

  const [currentTopic, setCurrentTopic] = useState(0);
  //const [selectedTopic, setSelectedTopic] = useState(0);
  const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic);

  const [currentCarouselField, setCarouselField] = useState(0);

  const [currentNrTopics, setNrTopics] = useState(5);
  const [currentMinTopicSize, setMinTopicSize] = useState(5);
  const [currentTopNWords, setTopNWords] = useState(5);

  enum TextInputId {
    NrTopics = "nr_topics",
    MinTopicSize = "min_topic_size",
    TopNWords = "top_n_words",
  }

  const [height, setHeight] = useState<number>(window.innerHeight);

  // Window resize effect
  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Handle Ollama response changes
  //useEffect(() => {
  //  console.log("ollamaResponse data updated: ", ollamaResponse.data);
  //}, [ollamaResponse]);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const [currentJobId, setCurrentJobId] = useState<string | undefined>(undefined);

  // actions
  const startMlJob = MLHooks.useStartMLJob();
  const pollMlJob = MLHooks.usePollMLJob(currentJobId, undefined);

  const handleTopicModelingStarted = (data: MLJobRead) => {
    setCurrentJobId(data.id);
  };

  const handleStartTopicModeling = (recompute: boolean = false) => {
    console.log(`Start of Topic Modeling in DocumentCategorization: ${currentNrTopics}`);
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

  // confirm dialog
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

  const diagramList = [
    <TopWordsBarChart topicNum={currentTopic} dataHook={top_words_data} />,
    <TopicDistrChart topicNum={currentTopic} dataHook={topic_distr_hook} />,
  ];

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

  return (
    <div>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>
        </CardContent>
        <Box
          sx={{
            width: "80%",
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
            <Select labelId="dynamic-dropdown-label" value={currentTopic} onChange={handleChange}>
              {top_words_data.isLoading && <div>Loading...</div>}
              {top_words_data.isSuccess ? (
                Object.keys(top_words_data.data).map((key) => (
                  <MenuItem key={key} value={key}>
                    {key}
                  </MenuItem>
                ))
              ) : (
                <div></div>
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
              width: "80%",
              margin: "auto",
              padding: 2,
            }}
          >
            {ollamaResponse.isLoading && <div style={{ textAlign: "center" }}>Loading...</div>}
            {ollamaResponse.isSuccess ? (
              <div style={{ whiteSpace: "pre-line", height: height * 0.2 }}>
                {ollamaResponse.data["reasoning"] as string}
              </div>
            ) : (
              <div></div>
            )}
          </Box>
        </Box>
      </Card>
    </div>
  );
}
export default DocumentCategorization;
