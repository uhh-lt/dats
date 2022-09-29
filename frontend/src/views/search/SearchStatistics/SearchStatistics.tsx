import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import KeywordStats from "./KeywordStats";
import CodeStats from "./CodeStats";
import DocumentTagStats from "./DocumentTagStats";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import SearchStatisticsContextMenu from "./SearchStatisticsContextMenu";
import { CodeRead, SpanEntityDocumentFrequency } from "../../../api/openapi";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import SearchHooks from "../../../api/SearchHooks";
import { SearchFilter } from "../SearchFilter";

interface SearchStatisticsProps {
  filter: SearchFilter[];
  handleKeywordClick: (keyword: string) => void;
  handleTagClick: (tagId: number) => void;
  handleCodeClick: (stat: SpanEntityDocumentFrequency) => void;
}

function SearchStatistics({
  filter,
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
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // query all codes of the current project
  const projectCodes = ProjectHooks.useGetAllCodes(projectId);

  // a code map that maps codeId -> CodeRead
  const codeMap = useMemo(() => {
    const result = new Map<number, CodeRead>();
    if (projectCodes.data) {
      projectCodes.data.forEach((code) => {
        result.set(code.id, code);
      });
    }
    return result;
  }, [projectCodes.data]);

  // stats
  const [validEntityStats, setValidEntityStats] = useState<Map<number, SpanEntityDocumentFrequency[]>>(new Map());
  const entityStats = SearchHooks.useSearchEntityDocumentStats(projectId, filter);
  const keywordStats = SearchHooks.useSearchKeywordStats(projectId, filter);
  const tagStats = SearchHooks.useSearchTagStats(projectId, filter);

  // computed
  const filteredProjectCodes = useMemo(() => {
    if (!projectCodes.data) return [];
    return projectCodes.data.filter((code) => validEntityStats.get(code.id) !== undefined);
  }, [projectCodes.data, validEntityStats]);

  // effects
  // make sure that a valid tab is selected, when the stats (and thus the documents) change
  useEffect(() => {
    if (entityStats.data) {
      if (tab !== "keywords" && tab !== "tags") {
        const currentCodeId = parseInt(tab);
        if (entityStats.data.get(currentCodeId) === undefined) {
          setTab("keywords");
        }
      }
      setValidEntityStats(entityStats.data);
    }
  }, [tab, setValidEntityStats, entityStats.data]);

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const openContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.pageX, y: event.pageY });
  }, []);
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);
  const handleMenuItemClick = useCallback((code: CodeRead) => {
    setTab(`${code.id}`);
  }, []);

  return (
    <Box className="myFlexContainer" {...(props as BoxProps)}>
      <TabContext value={tab}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }} className="myFlexFitContentContainer">
          <Tabs value={tab} onChange={handleTabChange} variant="scrollable" onContextMenu={openContextMenu}>
            <Tab label="Keywords" value="keywords" />
            <Tab label="Tags" value="tags" />
            {Array.from(validEntityStats.keys()).map((codeId) => (
              <Tab key={codeId} label={codeMap.get(codeId)?.name || "ERROR"} value={`${codeId}`} />
            ))}
          </Tabs>
        </Box>
        <Box className="myFlexFillAllContainer">
          <TabPanel value="keywords" sx={{ p: 2 }}>
            {keywordStats.isSuccess ? (
              <KeywordStats data={keywordStats.data} handleClick={handleKeywordClick} />
            ) : keywordStats.isError ? (
              <div>Error: {keywordStats.error.message}</div>
            ) : keywordStats.isLoading && keywordStats.isFetching ? (
              <div>Loading...</div>
            ) : (
              <></>
            )}
          </TabPanel>
          <TabPanel value="tags" sx={{ p: 2 }}>
            {tagStats.isSuccess ? (
              <DocumentTagStats data={tagStats.data} handleClick={handleTagClick} />
            ) : tagStats.isError ? (
              <div>Error: {tagStats.error.message}</div>
            ) : tagStats.isLoading && keywordStats.isFetching ? (
              <div>Loading...</div>
            ) : (
              <></>
            )}
          </TabPanel>
          {Array.from(validEntityStats.entries()).map(([codeId, data]) => (
            <TabPanel key={codeId} value={`${codeId}`} sx={{ p: 2 }}>
              <CodeStats key={codeId} data={data} handleClick={handleCodeClick} />
            </TabPanel>
          ))}
        </Box>
      </TabContext>
      <SearchStatisticsContextMenu
        menuItems={filteredProjectCodes}
        contextMenuData={contextMenuPosition}
        handleClose={closeContextMenu}
        handleMenuItemClick={handleMenuItemClick}
      />
    </Box>
  );
}

export default SearchStatistics;
