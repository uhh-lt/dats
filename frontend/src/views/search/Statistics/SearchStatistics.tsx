import { TabContext } from "@mui/lab";
import { Box, BoxProps, Stack, Tab, Tabs } from "@mui/material";
import React, { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { SpanEntityStat } from "../../../api/openapi/models/SpanEntityStat.ts";
import CodeStats from "./CodeStats.tsx";
import DocumentTagStats from "./DocumentTagStats.tsx";
import KeywordStats from "./KeywordStats.tsx";
import SearchStatisticsMenu from "./SearchStatisticsMenu.tsx";
import StatsSearchBar from "./StatsSearchBar.tsx";

interface SearchStatisticsProps {
  sdocIds: number[];
  handleKeywordClick: (keyword: string) => void;
  handleTagClick: (tagId: number) => void;
  handleCodeClick: (stat: SpanEntityStat) => void;
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
  const handleTabChange = (_event: React.SyntheticEvent, newValue: string): void => {
    setTab(newValue);
  };

  // get the current project id
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // query all codes of the current project
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  // menu
  const handleMenuItemClick = useCallback((navigateTo: string) => {
    setTab(navigateTo);
  }, []);

  // stats search bar value state initialisation
  const [filterStatsBy, setFilterStatsBy] = useState("");
  const handleSearchTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterStatsBy(event.target.value);
  };

  // The scrollable element for the lists
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <Box className="myFlexContainer" {...(props as BoxProps)}>
      <TabContext value={tab}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ borderBottom: 1, borderColor: "divider" }}
          className="myFlexFitContentContainer"
        >
          <SearchStatisticsMenu
            menuItems={projectCodes.data || []}
            handleMenuItemClick={handleMenuItemClick}
            sx={{ ml: 1 }}
          />
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable">
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {projectCodes.data?.map((code) => <Tab key={code.id} label={code.name} value={`${code.id}`} />)}
          </Tabs>
        </Stack>

        {/* Stats Searchbar Component */}
        <Box ref={parentRef} className="myFlexFitContentContainer" sx={{ borderBottom: 1, borderColor: "divider" }}>
          <StatsSearchBar handleSearchTextChange={handleSearchTextChange} />
        </Box>

        <Box ref={parentRef} className="myFlexFillAllContainer" p={2}>
          <KeywordStats
            sdocIds={sdocIds}
            handleClick={handleKeywordClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          <DocumentTagStats
            sdocIds={sdocIds}
            handleClick={handleTagClick}
            parentRef={parentRef}
            filterBy={filterStatsBy}
          />
          {projectCodes.data?.map((code) => (
            <CodeStats
              currentTab={tab}
              key={code.id}
              codeId={code.id}
              sdocIds={sdocIds}
              handleClick={handleCodeClick}
              parentRef={parentRef}
              filterBy={filterStatsBy}
            />
          ))}
        </Box>
      </TabContext>
    </Box>
  );
}

export default SearchStatistics;
