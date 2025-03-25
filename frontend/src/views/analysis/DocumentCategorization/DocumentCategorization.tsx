import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import {
  Box,
  Card,
  CardContent,
  Fab,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import AnalysisHooks from "../../../api/CodeFrequencyHooks.ts";
import ContentContainerLayout from "../../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import TopDocumentsBarChart from "./TopDocumentsBarChart.tsx";
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  // TopicNum is the number seen in the dropdown menu
  const [currentTopicNum, setCurrentTopicNum] = useState(0);

  const [currentCarouselField, setCarouselField] = useState(0);
  const [height, setHeight] = useState<number>(window.innerHeight);

  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const top_words_data = AnalysisHooks.useReturnTopWordsData(projectId);
  const topic_distr_hook = AnalysisHooks.useReturnTopicDistrData(projectId);

  const topic_document_data = AnalysisHooks.useReturnTopicDocuments(projectId, currentTopicNum);
  const {
    mutate: makeLLMInterpretation,
    isPending,
    data: ollamaData,
    isSuccess: ollamaSuccess,
  } = AnalysisHooks.useReturnTopWordsOllama(currentTopicNum, projectId);

  const diagramList = [
    <TopWordsBarChart topicNum={currentTopicNum} dataHook={top_words_data} />,
    <TopicDistrChart dataHook={topic_distr_hook} />,
    <TopDocumentsBarChart topicNum={currentTopicNum} dataHook={topic_document_data} />,
  ];

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopicNum(event.target.value as number);
  };

  const changeCarouselCard = (change: number) => {
    if (currentCarouselField + change < 0) {
      setCarouselField(diagramList.length - 1);
    } else {
      setCarouselField((currentCarouselField + change) % diagramList.length);
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

  const boxHeight = window.innerHeight * 0.5;

  return (
    <ContentContainerLayout>
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
          <FormControl fullWidth>
            <InputLabel id="dynamic-dropdown-label">Select Key</InputLabel>
            <Select labelId="dynamic-dropdown-label" value={currentTopicNum || ""} onChange={handleChange}>
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
            {isPending && <div>Loading...</div>}
            <Fab color="primary" size="small" onClick={() => makeLLMInterpretation()}>
              <ArrowRightIcon />
            </Fab>

            {ollamaSuccess && ollamaData ? (
              <Box
                sx={{
                  margin: "auto",
                  padding: 2,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ whiteSpace: "pre-line", height: height * 0.2 }}>{ollamaData["reasoning"]}</div>
              </Box>
            ) : (
              <div></div>
            )}
          </Box>
        </Box>
      </Card>
    </ContentContainerLayout>
  );
}
export default DocumentCategorization;
