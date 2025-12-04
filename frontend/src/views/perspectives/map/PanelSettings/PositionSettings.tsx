import LightbulbIcon from "@mui/icons-material/Lightbulb";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import RuleIcon from "@mui/icons-material/Rule";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  LinearProgress,
  ListItem,
  ListItemButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { PerspectivesJobType } from "../../../../api/openapi/models/PerspectivesJobType.ts";
import PerspectivesHooks from "../../../../api/PerspectivesHooks.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";
import { PerspectivesActions } from "../../perspectivesSlice.ts";
interface PositionSettingsProps {
  aspectId: number;
}

function PositionSettings({ aspectId }: PositionSettingsProps) {
  // aspect (to check modality and disable refinment)
  const aspect = PerspectivesHooks.useGetAspect(aspectId);

  // position settings
  const xAxis = useAppSelector((state) => state.perspectives.xAxis);
  const yAxis = useAppSelector((state) => state.perspectives.yAxis);
  const showTicks = useAppSelector((state) => state.perspectives.showTicks);
  const showGrid = useAppSelector((state) => state.perspectives.showGrid);
  const colorScheme = useAppSelector((state) => state.perspectives.colorScheme);
  const highlightReviewedDocs = useAppSelector((state) => state.perspectives.highlightReviewedDocs);

  // event handlers
  const dispatch = useAppDispatch();
  const handleXAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeXAxis(event.target.value));
  };
  const handleYAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeYAxis(event.target.value));
  };
  const handleShowTicks = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeShowTicks(event.target.checked));
  };
  const handleShowGrid = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(PerspectivesActions.onChangeShowGrid(event.target.checked));
  };
  const handleToggleHighlightReviewedDocs = () => {
    dispatch(PerspectivesActions.onChangeHighlightReviewedDocs(!highlightReviewedDocs));
  };

  // statistics
  const vis = PerspectivesHooks.useGetDocVisualization(aspectId);
  const { cluster2count, cluster2total } = useMemo(() => {
    const cluster2count: Record<number, number> = {};
    const cluster2total: Record<number, number> = {};
    vis.data?.clusters.forEach((cluster) => {
      cluster2count[cluster.id] = 0; // initialize with 0
      cluster2total[cluster.id] = 0; // initialize with 0
    });
    vis.data?.docs.forEach((doc) => {
      if (doc.is_accepted) {
        cluster2count[doc.cluster_id] = cluster2count[doc.cluster_id] + 1;
      }
      cluster2total[doc.cluster_id] = cluster2total[doc.cluster_id] + 1;
    });
    return { cluster2count: cluster2count, cluster2total: cluster2total };
  }, [vis.data]);

  // refinement
  const { mutate: startPerspectivesJob, isPending } = PerspectivesHooks.useStartPerspectivesJob();
  const handleRefineTM = () => {
    startPerspectivesJob({
      aspectId,
      requestBody: {
        perspectives_job_type: PerspectivesJobType.REFINE_MODEL,
      },
    });
  };

  // cluster selection
  const highlightedClusterId = useAppSelector((state) => state.perspectives.highlightedClusterId);
  const handleSelectCluster = (clusterId: number) => () => {
    dispatch(PerspectivesActions.onSelectCluster(clusterId));
  };

  return (
    <Box>
      <Stack spacing={3} p={2}>
        <TextField
          select
          label="X-Axis"
          value={xAxis}
          onChange={handleXAxisChange}
          size="small"
          variant="outlined"
          helperText="This is interpreted as a continuous variable."
          disabled
        >
          <MenuItem value="Cluster Dimension 1">Cluster Dimension 1</MenuItem>
          <MenuItem value="Cluster Dimension 2">Cluster Dimension 2</MenuItem>
          <MenuItem value="Cluster Dimension 3">Cluster Dimension 3</MenuItem>
        </TextField>
        <TextField
          select
          label="Y-Axis"
          value={yAxis}
          onChange={handleYAxisChange}
          size="small"
          variant="outlined"
          helperText="This is interpreted as a continuous variable."
          disabled
        >
          <MenuItem value="Cluster Dimension 1">Cluster Dimension 1</MenuItem>
          <MenuItem value="Cluster Dimension 2">Cluster Dimension 2</MenuItem>
          <MenuItem value="Cluster Dimension 3">Cluster Dimension 3</MenuItem>
        </TextField>
        <Box style={{ marginTop: "12px" }}>
          <FormControlLabel
            control={<Switch checked={showTicks} onChange={handleShowTicks} />}
            label={<Typography color="textSecondary">Show Axis Ticks</Typography>}
          />
        </Box>
        <Box style={{ marginTop: "12px" }}>
          <FormControlLabel
            control={<Switch checked={showGrid} onChange={handleShowGrid} />}
            label={<Typography color="textSecondary">Show Grid</Typography>}
          />
        </Box>
      </Stack>
      <Divider />
      <Stack spacing={1} mt={2}>
        <Typography px={1.5} variant="h6" alignItems="center" display="flex" gap={1} color="textSecondary">
          <RuleIcon />
          Review Statistics
        </Typography>
        <Stack direction="row" px={1} spacing={1} alignItems="center">
          <Button onClick={handleRefineTM} disabled={isPending || aspect?.data?.modality !== DocType.TEXT}>
            Refine Positioning
          </Button>
          <Button
            startIcon={highlightReviewedDocs ? <LightbulbIcon /> : <LightbulbOutlinedIcon />}
            onClick={handleToggleHighlightReviewedDocs}
          >
            Highlight reviewed docs
          </Button>
        </Stack>
        <Stack spacing={2}>
          {vis.data?.clusters.map((cluster, index) => {
            if (cluster.is_outlier) return null; // skip outlier clusters
            const count = cluster2count[cluster.id];
            const total = cluster2total[cluster.id];
            const color = colorScheme[index % colorScheme.length];
            return (
              <ListItem key={cluster.id} disablePadding>
                <ListItemButton
                  selected={highlightedClusterId === cluster.id}
                  role={undefined}
                  dense
                  onClick={handleSelectCluster(cluster.id)}
                >
                  <Box width="100%">
                    <Typography variant="caption" color="textSecondary">
                      {getIconComponent(Icon.CLUSTER, {
                        style: { fontSize: "10px", marginRight: "4px", color: color },
                      })}
                      {cluster.name}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Box sx={{ width: "100%", mr: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(count / total) * 100}
                          sx={{
                            backgroundColor: color + "80",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: color,
                            },
                          }}
                        />
                      </Box>
                      <Box flexShrink={0}>
                        <Typography variant="body2" color="text.secondary">{`${count}/${total}`}</Typography>
                      </Box>
                    </Box>
                  </Box>
                </ListItemButton>
              </ListItem>
            );
          })}
        </Stack>
        <Box px={2}>
          <Alert severity="info">
            Tipp: Refining document positions separates the clusters based on reviewed document&harr;cluster
            assignments. This process also updates all clusters!
          </Alert>
        </Box>
      </Stack>
    </Box>
  );
}

export default PositionSettings;
