import { TabContext, TabPanel } from "@mui/lab";
import { Box, BoxProps, Tab, Tabs } from "@mui/material";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import KeywordStats from "./KeywordStats";
import CodeStats from "./CodeStats";
import useComputeEntityStats from "./useComputeEntityStats";
import DocumentTagStats from "./DocumentTagStats";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks";
import SearchStatisticsContextMenu from "./SearchStatisticsContextMenu";
import { CodeRead } from "../../../api/openapi";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";

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

  // a code map that maps codeId -> CodeRead
  const codeMap = useMemo(() => {
    const result = new Map<number, CodeRead>();
    if (projectCodes.data) {
      projectCodes.data.forEach((code) => {
        result.set(code.id, code);
      });
    }
    return result;
  }, [projectCodes]);

  // stats
  const [validStats, setValidStats] = useState(new Map<number, Map<string, number>>());
  const stats = useComputeEntityStats(sdocIds);

  // computed
  const filteredProjectCodes = useMemo(() => {
    if (!projectCodes.data) return [];
    return projectCodes.data.filter((code) => validStats.get(code.id) !== undefined);
  }, [projectCodes.data, validStats]);

  // effects
  // make sure that a valid tab is selected, when the stats (and thus the documents) change
  useEffect(() => {
    if (tab !== "keywords" && tab !== "tags") {
      const currentCodeId = parseInt(tab);
      if (stats.get(currentCodeId) === undefined) {
        setTab("keywords");
      }
    }
    setValidStats(stats);
  }, [tab, setValidStats, stats]);

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = React.useState<ContextMenuPosition | null>(null);
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
            {Array.from(validStats.keys()).map((codeId) => (
              <Tab key={codeId} label={codeMap.get(codeId)?.name || "ERROR"} value={`${codeId}`} />
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
          {Array.from(validStats.entries()).map(([codeId, data]) => (
            <TabPanel key={codeId} value={`${codeId}`} sx={{ p: 2 }}>
              <CodeStats key={codeId} codeId={codeId} data={data} handleClick={handleCodeClick} />
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
