import { TabContext } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const handleMenuItemClick = useCallback((navigateTo: string) => {
    setTab(navigateTo);
  }, []);

  // The scrollable element for the lists
  const parentRef = useRef();

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
        <Box ref={parentRef} className="myFlexFillAllContainer" p={2}>
          <KeywordStats keywordStats={keywordStats} handleClick={handleKeywordClick} parentRef={parentRef} />
          <DocumentTagStats tagStats={tagStats} handleClick={handleTagClick} parentRef={parentRef} />
          {Array.from(validEntityStats.entries()).map(([codeId, data]) => (
            <CodeStats
              key={codeId}
              codeId={codeId}
              codeStats={data}
              handleClick={handleCodeClick}
              parentRef={parentRef}
            />
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
