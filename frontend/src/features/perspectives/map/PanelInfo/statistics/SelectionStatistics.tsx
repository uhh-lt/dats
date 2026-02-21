import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import { Box, Button, Divider, LinearProgress, Stack, Tooltip, Typography } from "@mui/material";
import { useCallback, useMemo } from "react";
import { CodeHooks } from "../../../../../api/CodeHooks.ts";
import { MetadataHooks } from "../../../../../api/MetadataHooks.ts";
import { SpanEntityStat } from "../../../../../api/openapi/models/SpanEntityStat.ts";
import { PerspectivesHooks } from "../../../../../api/PerspectivesHooks.ts";
import { CodeRenderer } from "../../../../../core/code/renderer/CodeRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../../../plugins/ReduxHooks.ts";
import { SearchStatisticsMenu } from "../../../../search/Statistics/SearchStatisticsMenu.tsx";
import { PerspectivesActions } from "../../../perspectivesSlice.ts";
import { MapCodeStats } from "./MapCodeStats.tsx";
import { MapKeywordStats } from "./MapKeywordStats.tsx";
import { MapTagStats } from "./MapTagStats.tsx";

interface SelectionStatisticsProps {
  projectId: number;
  aspectId: number;
}

export function SelectionStatistics({ projectId, aspectId }: SelectionStatisticsProps) {
  // global client state
  const selectedSdocIds = useAppSelector((state) => state.perspectives.selectedSdocIds);

  // global server state
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const total = vis.data?.docs.length || 0;
  const count = selectedSdocIds.length;

  // filter
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();

  // computed (local client state)
  const keywordMetadataIds = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((m) => m.key === "keywords").map((m) => m.id);
  }, [projectMetadata.data]);

  // handle filtering
  const dispatch = useAppDispatch();
  const handleAddCodeFilter = useCallback(
    (stat: SpanEntityStat) => {
      dispatch(
        PerspectivesActions.onAddSpanAnnotationFilter({
          codeId: stat.code_id,
          spanText: stat.span_text,
          filterName: `aspect-${aspectId}`,
        }),
      );
    },
    [aspectId, dispatch],
  );
  const handleAddKeywordFilter = useCallback(
    (keyword: string) => {
      console.log("Adding keyword filter", keyword);
      dispatch(
        PerspectivesActions.onAddKeywordFilter({ keywordMetadataIds, keyword, filterName: `aspect-${aspectId}` }),
      );
    },
    [aspectId, dispatch, keywordMetadataIds],
  );
  const handleAddTagFilter = useCallback(
    (tagId: number) => {
      dispatch(PerspectivesActions.onAddTagFilter({ tagId, filterName: `aspect-${aspectId}` }));
    },
    [aspectId, dispatch],
  );

  // query all codes of the current project
  const projectCodes = CodeHooks.useGetEnabledCodes();
  const pinnedStatistics = useAppSelector((state) => state.perspectives.pinnedStatistics);
  const handlePinStatistics = useCallback(
    (stat: string) => {
      dispatch(PerspectivesActions.onPinStatistics(stat));
    },
    [dispatch],
  );
  const handleUnpinStatistics = useCallback(
    (stat: string) => {
      dispatch(PerspectivesActions.onUnpinStatistics(stat));
    },
    [dispatch],
  );

  return (
    <Box className="myFlexContainer h100">
      {selectedSdocIds.length === 0 ? (
        <Typography p={1}>Use the selection tools to select documents :)</Typography>
      ) : (
        <Box px={2}>
          <Typography variant="caption" color="textSecondary">
            Selected documents
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mt: -0.5 }}>
            <Box sx={{ width: "100%", mr: 1 }}>
              <LinearProgress variant="determinate" value={(count / total) * 100} />
            </Box>
            <Box flexShrink={0}>
              <Typography variant="body2" color="text.secondary">{`${count}/${total}`}</Typography>
            </Box>
          </Box>
        </Box>
      )}
      <Box flexGrow={0} px={1}>
        <SearchStatisticsMenu
          menuItems={projectCodes.data || []}
          handleMenuItemClick={handlePinStatistics}
          renderButton={(onClick) => (
            <Tooltip title={"Pin new Statistics"} placement="left">
              <Button startIcon={<PushPinOutlinedIcon />} onClick={onClick}>
                Pin new statistics
              </Button>
            </Tooltip>
          )}
        />
      </Box>
      {pinnedStatistics.map((stat) => {
        if (stat === "keywords") {
          return (
            <Stack overflow="auto" flexGrow={1} key={stat} minHeight="71px">
              <Divider />
              <Box px={1}>
                <Tooltip title={"Unpin Keyword Statistics"} placement="left">
                  <Button startIcon={<PushPinIcon />} onClick={() => handleUnpinStatistics("keywords")}>
                    Keyword Statistics
                  </Button>
                </Tooltip>
              </Box>
              <Box px={2} overflow="auto">
                <MapKeywordStats sdocIds={selectedSdocIds} projectId={projectId} handleClick={handleAddKeywordFilter} />
              </Box>
            </Stack>
          );
        } else if (stat === "tags") {
          return (
            <Stack overflow="auto" flexGrow={1} key={stat} minHeight="71px">
              <Divider />
              <Box px={1} flexShrink={0}>
                <Tooltip title={"Unpin Tag Statistics"} placement="left">
                  <Button startIcon={<PushPinIcon />} onClick={() => handleUnpinStatistics("tags")}>
                    Tag Statistics
                  </Button>
                </Tooltip>
              </Box>
              <Box px={2} overflow="auto">
                <MapTagStats sdocIds={selectedSdocIds} projectId={projectId} handleClick={handleAddTagFilter} />
              </Box>
            </Stack>
          );
        } else {
          const codeId = parseInt(stat);
          return (
            <Stack overflow="auto" flexGrow={1} key={stat} minHeight="71px">
              <Divider />
              <Box px={1}>
                <Tooltip title={"Unpin Code Statistics"} placement="left">
                  <Button startIcon={<PushPinIcon />} onClick={() => handleUnpinStatistics(stat)}>
                    <span style={{ marginRight: "6px" }}>Code</span>
                    <CodeRenderer code={codeId} />
                    <span style={{ marginLeft: "6px" }}>Statistics</span>
                  </Button>
                </Tooltip>
              </Box>
              <Box overflow="auto" px={2}>
                <MapCodeStats sdocIds={selectedSdocIds} codeId={codeId} handleClick={handleAddCodeFilter} />
              </Box>
            </Stack>
          );
        }
      })}
    </Box>
  );
}
