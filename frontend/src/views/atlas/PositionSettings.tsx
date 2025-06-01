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
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { AtlasActions } from "./atlasSlice.ts";
interface PositionSettingsProps {
  aspectId: number;
}

function PositionSettings({ aspectId }: PositionSettingsProps) {
  // position settings
  const xAxis = useAppSelector((state) => state.atlas.xAxis);
  const yAxis = useAppSelector((state) => state.atlas.yAxis);
  const showTicks = useAppSelector((state) => state.atlas.showTicks);
  const showGrid = useAppSelector((state) => state.atlas.showGrid);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);
  const highlightReviewedDocs = useAppSelector((state) => state.atlas.highlightReviewedDocs);

  // event handlers
  const dispatch = useAppDispatch();
  const handleXAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeXAxis(event.target.value));
  };
  const handleYAxisChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeYAxis(event.target.value));
  };
  const handleShowTicks = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeShowTicks(event.target.checked));
  };
  const handleShowGrid = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeShowGrid(event.target.checked));
  };
  const handleToggleHighlightReviewedDocs = () => {
    dispatch(AtlasActions.onChangeHighlightReviewedDocs(!highlightReviewedDocs));
  };

  // statistics
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);
  const { topic2count, topic2total } = useMemo(() => {
    const topic2count: Record<number, number> = {};
    const topic2total: Record<number, number> = {};
    vis.data?.topics.forEach((topic) => {
      topic2count[topic.id] = 0; // initialize with 0
      topic2total[topic.id] = 0; // initialize with 0
    });
    vis.data?.docs.forEach((doc) => {
      if (doc.is_accepted) {
        topic2count[doc.topic_id] = topic2count[doc.topic_id] + 1;
      }
      topic2total[doc.topic_id] = topic2total[doc.topic_id] + 1;
    });
    return { topic2count, topic2total };
  }, [vis.data]);

  // refinement
  const { mutate: startTMJob, isPending } = TopicModellingHooks.useStartTMJob();
  const handleRefineTM = () => {
    startTMJob({
      aspectId,
      requestBody: {
        tm_job_type: TMJobType.REFINE_TOPIC_MODEL,
      },
    });
  };

  // topic selection
  const highlightedTopicId = useAppSelector((state) => state.atlas.highlightedTopicId);
  const handleSelectTopic = (topicId: number) => () => {
    dispatch(AtlasActions.onSelectTopic(topicId));
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
        >
          <MenuItem value="Topic Dimension 1">Topic Dimension 1</MenuItem>
          <MenuItem value="Topic Dimension 2">Topic Dimension 2</MenuItem>
          <MenuItem value="Topic Dimension 3">Topic Dimension 3</MenuItem>
        </TextField>
        <TextField
          select
          label="Y-Axis"
          value={yAxis}
          onChange={handleYAxisChange}
          size="small"
          variant="outlined"
          helperText="This is interpreted as a continuous variable."
        >
          <MenuItem value="Topic Dimension 1">Topic Dimension 1</MenuItem>
          <MenuItem value="Topic Dimension 2">Topic Dimension 2</MenuItem>
          <MenuItem value="Topic Dimension 3">Topic Dimension 3</MenuItem>
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
          <Button onClick={handleRefineTM} disabled={isPending}>
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
          {vis.data?.topics.map((topic, index) => {
            if (topic.is_outlier) return null; // skip outlier topics
            const count = topic2count[topic.id];
            const total = topic2total[topic.id];
            const color = colorScheme[index % colorScheme.length];
            return (
              <ListItem key={topic.id} disablePadding>
                <ListItemButton
                  selected={highlightedTopicId === topic.id}
                  role={undefined}
                  dense
                  onClick={handleSelectTopic(topic.id)}
                >
                  <Box width="100%">
                    <Typography variant="caption" color="textSecondary">
                      {getIconComponent(Icon.TOPIC, { style: { fontSize: "10px", marginRight: "4px", color: color } })}
                      {topic.name}
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
            Tipp: Refining document positions separates the topics based on reviewed document&harr;topic assignments.
            This process also updates all topics!
          </Alert>
        </Box>
      </Stack>
    </Box>
  );
}

export default PositionSettings;
