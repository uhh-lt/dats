import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import React, { useState } from "react";
import KeywordStats from "./KeywordStats";
import CodeStats from "./CodeStats";
import useComputeEntityStats from "./useComputeEntityStats";
import DocumentTagStats from "./DocumentTagStats";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";

interface SearchStatisticsProps {
  sdocIds: number[];
  handleKeywordClick: (keyword: string) => void;
  handleTagClick: (tagId: number) => void;
  handleCodeClick: (codeId: number, text: string) => void;
}

function SearchStatistics({
  sdocIds,
  handleCodeClick,
  handleKeywordClick,
  handleTagClick,
  ...props
}: SearchStatisticsProps & BoxProps) {
  // tabs
  const [tab, setTab] = useState("keywords");
  const handleTabChange = (event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // get the current project id
  const { projectId } = useParams() as { projectId: string };

  // query all codes of the current project
  const projectCodes = ProjectHooks.useGetAllCodes(parseInt(projectId));

  // stats
  const stats = useComputeEntityStats(sdocIds);

  return (
    <Box className="myFlexContainer" {...(props as BoxProps)}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {projectCodes.data?.map((code) => (
              <Tab key={code.id} label={code.name} value={`code-${code.id}`} />
            ))}
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="keywords" sx={{ p: 2 }}>
            <KeywordStats documentIds={sdocIds} handleClick={handleKeywordClick} />
          </TabPanel>
          <TabPanel value="tags" sx={{ p: 2 }}>
            <DocumentTagStats documentIds={sdocIds} handleClick={handleTagClick} />
          </TabPanel>
          {Array.from(stats.entries()).map(([codeId, data]) => (
            <TabPanel key={codeId} value={`code-${codeId}`} sx={{ p: 2 }}>
              <CodeStats key={codeId} codeId={codeId} data={data} handleClick={handleCodeClick} />
            </TabPanel>
          ))}
        </Box>
      </TabContext>
    </Box>
  );
}

export default SearchStatistics;
