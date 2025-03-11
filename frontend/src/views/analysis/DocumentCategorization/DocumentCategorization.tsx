import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import NotStartedIcon from "@mui/icons-material/NotStarted";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Avatar,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  Grid2,
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
  const topic_distr_data = AnalysisHooks.useReturnTopicDistrData();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();

  const [currentTopic, setCurrentTopic] = useState(0);
  //const [selectedTopic, setSelectedTopic] = useState(0);
  //const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic);

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

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopic(event.target.value as number);
  };

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
    startMlJob.mutate(
      {
        requestBody: {
          ml_job_type: MLJobType.TOPIC_MODELING,
          project_id: projectId,
          specific_ml_job_parameters: {
            recompute: recompute,
            ml_job_type: MLJobType.TOPIC_MODELING,
            nr_topics: 2,
            min_topic_size: 2,
            top_n_words: 5,
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

  return (
    <div>
      <Card>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>
        </CardContent>
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

        <Grid2 container spacing={2} sx={{ maxHeight: height * 0.75, overflowY: "auto" }}>
          <Grid2 size={6}>
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
              ,
            </List>
          </Grid2>
          <Grid2 size={6} style={{ textAlign: "center" }}>
            {top_words_data.isLoading && <div>Loading...</div>}
            {top_words_data.isSuccess ? (
              <TopWordsBarChart
                data={top_words_data.data as Record<string, { word: string; score: number }>[]}
                topicNum={currentTopic}
              ></TopWordsBarChart>
            ) : (
              <div></div>
            )}
          </Grid2>
          <Grid2 size={2} sx={{ textAlign: "left", overflowY: "auto" }}></Grid2>
          <Grid2 size={6} style={{ textAlign: "center" }}>
            {topic_distr_data.isLoading && <div>Loading...</div>}
            {topic_distr_data.isSuccess ? (
              <TopicDistrChart data={topic_distr_data.data as Record<string, number>[]}></TopicDistrChart>
            ) : (
              <div></div>
            )}
          </Grid2>
        </Grid2>
      </Card>
    </div>
  );
}
export default DocumentCategorization;
