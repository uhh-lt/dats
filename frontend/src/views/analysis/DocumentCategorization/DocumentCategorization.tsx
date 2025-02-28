import {
  Card,
  CardContent,
  FormControl,
  Grid2,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import AnalysisHooks from "../../../api/CodeFrequencyHooks.ts";
import TopWordsBarChart from "./TopWordsBarChart.tsx";
import TopicDistrChart from "./TopicDistrBarChart.tsx";

function DocumentCategorization() {
  const topic_distr_data = AnalysisHooks.useReturnTopicDistrData();
  const top_words_data = AnalysisHooks.useReturnTopWordsData();

  const [currentTopic, setCurrentTopic] = useState(0);
  //const [selectedTopic, setSelectedTopic] = useState(0);
  const ollamaResponse = AnalysisHooks.useReturnTopWordsOllama(currentTopic);

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
  useEffect(() => {
    console.log("ollamaResponse data updated: ", ollamaResponse.data);
  }, [ollamaResponse]);

  const handleChange = (event: SelectChangeEvent<number>) => {
    setCurrentTopic(event.target.value as number);
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
          <Grid2 size={9} style={{ textAlign: "center" }}>
            Top Words Graph
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
          <Grid2 size={3} sx={{ textAlign: "left", overflowY: "auto" }}>
            {ollamaResponse.isLoading && <div style={{ textAlign: "center" }}>Loading...</div>}
            {ollamaResponse.isSuccess ? (
              <div style={{ whiteSpace: "pre-line", height: height * 0.2 }}>
                {ollamaResponse.data["reasoning"] as string}
              </div>
            ) : (
              <div></div>
            )}
          </Grid2>
          <Grid2 size={9} style={{ textAlign: "center" }}>
            Topic Distr / Main Docs where Topic is found
            {topic_distr_data.isLoading && <div>Loading...</div>}
            {topic_distr_data.isSuccess ? (
              <TopicDistrChart data={topic_distr_data.data as Record<string, number>[]}></TopicDistrChart>
            ) : (
              <div></div>
            )}
          </Grid2>
          <Grid2 size={3} style={{ textAlign: "center" }}>
            TODO: Display ChatGPT Result
          </Grid2>
        </Grid2>
      </Card>
    </div>
  );
}
export default DocumentCategorization;
