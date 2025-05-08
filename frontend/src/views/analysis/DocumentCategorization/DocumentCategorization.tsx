import ArrowLeftIcon from "@mui/icons-material/ArrowLeft";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import {
  Box,
  Button,
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

  const [currentInterpretation, setInterpretation] = useState<Record<string, string> | null>(null);

  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  const top_words_data = AnalysisHooks.useReturnTopWordsData(projectId);
  const topic_distr_hook = AnalysisHooks.useReturnTopicDistrData(projectId);

  const topic_document_data = AnalysisHooks.useReturnTopicDocuments(projectId, currentTopicNum);
  const {
    mutate: makeLLMInterpretation,
    isPending,
    data: ollamaData,
  } = AnalysisHooks.useReturnTopWordsOllama(currentTopicNum, projectId);

  const carouselDiagramList = [
    <TopWordsBarChart chartName={"Top Words"} topicNum={currentTopicNum} dataHook={top_words_data} />,
    <TopicDistrChart chartName={"Topic Distribution"} dataHook={topic_distr_hook} />,
    <TopDocumentsBarChart chartName={"Top Documents"} topicNum={currentTopicNum} dataHook={topic_document_data} />,
  ];

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopicNum(event.target.value as number);
    setInterpretation(null);
  };

  const calcCarouselCardNum = (change: number) => {
    let newCardNum = 0;
    if (currentCarouselField + change < 0) {
      newCardNum = carouselDiagramList.length - 1;
    } else {
      newCardNum = (currentCarouselField + change) % carouselDiagramList.length;
    }
    return newCardNum;
  };

  const changeCarouselCard = (change: number) => {
    setCarouselField(calcCarouselCardNum(change));
  };

  useEffect(() => {
    if (ollamaData) {
      setInterpretation(ollamaData);
    }
  }, [ollamaData]);

  return (
    <ContentContainerLayout>
      <Card sx={{ flexShrink: 0, height: "fit-content" }}>
        <CardContent>
          <Typography gutterBottom sx={{ color: "text.secondary", fontSize: 14 }}>
            Document Categorization using LLM's and Topic Modeling
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "0.5vh" }}>
            <FormControl>
              <InputLabel>Select Topic</InputLabel>
              <Select value={currentTopicNum || ""} onChange={handleChange} sx={{ textAlign: "center", width: "25vw" }}>
                {top_words_data.isLoading && (
                  <MenuItem disabled sx={{ display: "flex", justifyContent: "center", textAlign: "center" }}>
                    Loading...
                  </MenuItem>
                )}

                {top_words_data.isSuccess && Object.keys(top_words_data.data).length > 0 ? (
                  Object.keys(top_words_data.data).map((key) => (
                    <MenuItem
                      key={key}
                      value={key}
                      sx={{ display: "flex", justifyContent: "center", textAlign: "center" }}
                    >
                      {key}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled sx={{ display: "flex", justifyContent: "center", textAlign: "center" }}>
                    No options available
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              margin: "auto",
              padding: "0.5vh",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div>{carouselDiagramList[calcCarouselCardNum(-1)].props.chartName}</div>
              <Fab color="primary" size="small" onClick={() => changeCarouselCard(-1)}>
                <ArrowLeftIcon />
              </Fab>
            </Box>
            {carouselDiagramList[currentCarouselField].props.dataHook.isLoading && <div>Loading...</div>}
            {carouselDiagramList[currentCarouselField].props.dataHook.isSuccess ? (
              carouselDiagramList[currentCarouselField]
            ) : (
              <></>
            )}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div>{carouselDiagramList[calcCarouselCardNum(1)].props.chartName}</div>
              <Fab color="primary" size="small" onClick={() => changeCarouselCard(1)}>
                <ArrowRightIcon />
              </Fab>
            </Box>
          </Box>
          <Box
            sx={{
              margin: "auto",
              padding: 2,
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <Button variant="outlined" onClick={() => makeLLMInterpretation()}>
                Generate Interpretation for Topic: {currentTopicNum}
              </Button>
            </Box>
            {isPending && <div style={{ textAlign: "center" }}>Loading...</div>}

            {currentInterpretation ? (
              <Box
                sx={{
                  margin: "auto",
                  padding: 2,
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h3 style={{ textAlign: "center" }}>{currentInterpretation["topic_name"]}</h3>
                <Box
                  sx={{
                    maxHeight: "20vh",
                    overflow: "auto",
                    padding: 1,
                    border: "1px solid #ddd",
                    borderRadius: 2,
                  }}
                >
                  {currentInterpretation["reasoning"]}
                </Box>
              </Box>
            ) : (
              <></>
            )}
          </Box>
        </CardContent>
      </Card>
    </ContentContainerLayout>
  );
}
export default DocumentCategorization;
