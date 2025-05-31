import {
  Alert,
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Radio,
  Slider,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import * as d3 from "d3";
import { useState } from "react";
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";
import { TMVisualization } from "../../api/openapi/models/TMVisualization.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import ConfirmationAPI from "../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { AtlasActions } from "./atlasSlice.ts";
import TopicCreationDialog from "./TopicCreationDialog.tsx";

const colorSchemes: Record<string, string[]> = {
  category: d3.schemeCategory10 as string[],
  accent: d3.schemeAccent as string[],
  dark: d3.schemeDark2 as string[],
  observable: d3.schemeObservable10 as string[],
  paired: d3.schemePaired as string[],
  pastel1: d3.schemePastel1 as string[],
  pastel2: d3.schemePastel2 as string[],
  set1: d3.schemeSet1 as string[],
  set2: d3.schemeSet2 as string[],
  set3: d3.schemeSet3 as string[],
  tableau: d3.schemeTableau10 as string[],
};

const getAcceptedAssignmentsOfTopic = (topicId: number, vis: TMVisualization) => {
  return vis.docs.filter((doc) => doc.topic_id === topicId).filter((doc) => doc.is_accepted).length;
};

interface ColorSettingsProps {
  aspectId: number;
}

function ColorSettings({ aspectId }: ColorSettingsProps) {
  // view settings
  const colorBy = useAppSelector((state) => state.atlas.colorBy);
  const colorSchemeName = useAppSelector((state) => state.atlas.colorSchemeName);
  const pointSize = useAppSelector((state) => state.atlas.pointSize);
  const showLabels = useAppSelector((state) => state.atlas.showLabels);

  // event handlers
  const dispatch = useAppDispatch();
  const handleColorByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeColorBy(event.target.value));
  };
  const handleColorSchemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(
      AtlasActions.onChangeColorScheme({
        colorSchemeName: event.target.value,
        colorScheme: colorSchemes[event.target.value],
      }),
    );
  };
  const handlePointSizeChange = (_event: React.SyntheticEvent | Event, value: number | number[]) => {
    dispatch(AtlasActions.onChangePointSize(value as number));
  };
  const handleShowLabelsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeShowLabels(event.target.checked));
  };

  // topics / legend
  const { mutate: startTMJob, isPending } = TopicModellingHooks.useStartTMJob();

  // global server state
  const vis = TopicModellingHooks.useGetDocVisualization(aspectId);

  // topic click
  const handleTopicClick = (topicId: number) => () => {
    if (mergeMode) {
      handleToggleTopic(topicId);
    } else if (deleteMode || splitMode) {
      handleSingleSelect(topicId);
    } else {
      handleSelectTopic(topicId);
    }
  };

  // topic selection
  const highlightedTopicId = useAppSelector((state) => state.atlas.highlightedTopicId);
  const handleSelectTopic = (topicId: number) => {
    dispatch(AtlasActions.onSelectTopic(topicId));
  };

  // merging
  const [mergeMode, setMergeMode] = useState(false);
  const handleToggleMergeMode = () => {
    setMergeMode((prev) => !prev);
    setChecked([]);
  };
  const handleConfirmMerge = () => {
    if (checked.length !== 2) return;
    startTMJob(
      {
        aspectId,
        requestBody: {
          tm_job_type: TMJobType.MERGE_TOPICS,
          topic_to_keep: checked[0],
          topic_to_merge: checked[1],
        },
      },
      {
        onSuccess: () => {
          setMergeMode(false);
          setChecked([]);
        },
      },
    );
  };

  // deletion
  const [deleteMode, setDeleteMode] = useState(false);
  const handleToggleDeleteMode = () => {
    setDeleteMode((prev) => !prev);
    setChoosen(undefined);
  };
  const handleConfirmDeletion = () => {
    if (choosen === undefined) return;
    const startJob = () => {
      startTMJob(
        {
          aspectId,
          requestBody: {
            tm_job_type: TMJobType.REMOVE_TOPIC,
            topic_id: choosen,
          },
        },
        {
          onSuccess: () => {
            setDeleteMode(false);
            setChoosen(undefined);
          },
        },
      );
    };
    const numAccepted = getAcceptedAssignmentsOfTopic(choosen, vis.data!);
    if (numAccepted === 0) {
      startJob();
    } else {
      ConfirmationAPI.openConfirmationDialog({
        text: `Are you sure you want to delete topic ${choosen}? This will also reset your ${numAccepted} reviewed document&harr;topic assignments.`,
        onAccept: () => {
          startJob();
        },
      });
    }
  };

  // splitting
  const [splitMode, setSplitMode] = useState(false);
  const handleToggleSplitMode = () => {
    setSplitMode((prev) => !prev);
    setChoosen(undefined);
  };
  const handleConfirmSplit = () => {
    if (choosen === undefined) return;
    const startJob = () => {
      startTMJob(
        {
          aspectId,
          requestBody: {
            tm_job_type: TMJobType.SPLIT_TOPIC,
            topic_id: choosen,
          },
        },
        {
          onSuccess: () => {
            setSplitMode(false);
            setChoosen(undefined);
          },
        },
      );
    };
    const numAccepted = getAcceptedAssignmentsOfTopic(choosen, vis.data!);
    if (numAccepted === 0) {
      startJob();
    } else {
      ConfirmationAPI.openConfirmationDialog({
        text: `Are you sure you want to split topic ${choosen}? This will also reset your ${numAccepted} reviewed document&harr;topic assignments.`,
        onAccept: () => {
          startJob();
        },
      });
    }
  };

  // multi select with checkboxes
  const [checked, setChecked] = useState<number[]>([]);
  const handleToggleTopic = (topicId: number) => {
    const currentIndex = checked.indexOf(topicId);
    const newChecked = [...checked];
    if (currentIndex === -1) {
      newChecked.push(topicId);
    } else {
      newChecked.splice(currentIndex, 1);
    }

    setChecked(newChecked);
  };

  // single select
  const [choosen, setChoosen] = useState<number | undefined>(undefined);
  const handleSingleSelect = (topicId: number) => {
    if (choosen === topicId) {
      setChoosen(undefined);
    } else {
      setChoosen(topicId);
    }
  };

  const selectType = mergeMode ? "multi" : deleteMode || splitMode ? "single" : "none";

  return (
    <Box>
      <Stack spacing={3} p={2}>
        <TextField
          select
          label="Color by"
          value={colorBy}
          onChange={handleColorByChange}
          size="small"
          variant="outlined"
        >
          <MenuItem value="topic-broad">Topics: Broad</MenuItem>
          <MenuItem value="topic-medium">Topics: Medium</MenuItem>
          <MenuItem value="topic-fine">Topics: Fine</MenuItem>
        </TextField>
        <TextField
          select
          fullWidth
          label="Color Scheme"
          value={colorSchemeName}
          onChange={handleColorSchemeChange}
          size="small"
          variant="outlined"
          slotProps={{
            select: {
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 300, // Adjust dropdown max height if needed
                  },
                },
              },
              renderValue: () => {
                const colors = colorSchemes[colorSchemeName];
                return (
                  <Stack direction={"row"} spacing={1} alignItems="center">
                    <Typography width="90px" flexShrink={0}>
                      {colorSchemeName}
                    </Typography>
                    <Stack direction={"row"} spacing={0.5} width="100%">
                      {colors.map((color, index) => (
                        <Box
                          key={`${colorSchemeName}-selected-${color}-${index}`}
                          sx={{
                            height: "12px",
                            width: "12px",
                            backgroundColor: color,
                          }}
                        />
                      ))}
                    </Stack>
                  </Stack>
                );
              },
            },
          }}
        >
          {Object.entries(colorSchemes).map(([schemeName, colors]) => (
            <MenuItem key={schemeName} value={schemeName}>
              <Stack direction={"row"} spacing={1} alignItems="center">
                <Typography width="90px" flexShrink={0}>
                  {schemeName}
                </Typography>
                <Stack direction={"row"} spacing={0.5} width="100%">
                  {colors.map((color, index) => (
                    <Box
                      key={`${schemeName}-selected-${color}-${index}`}
                      sx={{
                        height: "12px",
                        width: "12px",
                        backgroundColor: color,
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </MenuItem>
          ))}
        </TextField>
        <Box>
          <Typography color="textSecondary">Point Size</Typography>
          <Slider
            size="small"
            defaultValue={pointSize}
            step={1}
            min={5}
            max={100}
            onChangeCommitted={handlePointSizeChange}
          />
        </Box>
        <Box style={{ marginTop: "12px" }}>
          <FormControlLabel
            control={<Switch checked={showLabels} onChange={handleShowLabelsChange} />}
            label={<Typography color="textSecondary">Show Topic Labels</Typography>}
          />
        </Box>
      </Stack>
      <Divider />
      <Stack spacing={1} mt={2}>
        <Typography px={1.5} variant="h6" alignItems="center" display="flex" gap={1} color="textSecondary">
          {getIconComponent(Icon.TOPICS, { style: {} })}
          Legend/Topics
        </Typography>
        <Stack direction="row" px={1} spacing={1} alignItems="center">
          {!mergeMode && !deleteMode && !splitMode && (
            <>
              <TopicCreationDialog aspectId={aspectId} />
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Topic Removal</Typography>
                    This action <em>deletes</em> the topic. The documents are assigned to the closest topic. Your
                    document&harr;topic assignments are reset!
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleDeleteMode} disabled={isPending}>
                    Remove Topic
                  </Button>
                </span>
              </Tooltip>
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Topic Splitting</Typography>
                    This action analyzes and <em>splits documents into new topics</em>. It <u>deletes</u> the topic, but
                    creates several new ones. Your document&harr;topic assignments are reset!
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleSplitMode} disabled={isPending}>
                    Split Topic
                  </Button>
                </span>
              </Tooltip>
              <Tooltip
                enterDelay={500}
                placement="bottom-start"
                title={
                  <>
                    <Typography color="inherit">Topic Merging</Typography>
                    This action <em>merges two topics</em>. One topic is kept, one is <u>deleted</u>. All documents are
                    assigned to the kept topic.
                  </>
                }
              >
                <span>
                  <Button onClick={handleToggleMergeMode} disabled={isPending}>
                    Merge Topics
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
          {mergeMode && (
            <>
              <Button onClick={handleConfirmMerge} disabled={checked.length !== 2} loading={isPending}>
                Confirm Merge
              </Button>
              <Button onClick={handleToggleMergeMode} disabled={isPending}>
                Cancel Merge
              </Button>
            </>
          )}
          {deleteMode && (
            <>
              <Button onClick={handleConfirmDeletion} disabled={choosen === undefined} loading={isPending}>
                Confirm Deletion
              </Button>
              <Button onClick={handleToggleDeleteMode} disabled={isPending}>
                Cancel Deletion
              </Button>
            </>
          )}
          {splitMode && (
            <>
              <Button onClick={handleConfirmSplit} disabled={choosen === undefined} loading={isPending}>
                Confirm Split
              </Button>
              <Button onClick={handleToggleSplitMode} disabled={isPending}>
                Cancel Split
              </Button>
            </>
          )}
        </Stack>
        <Typography px={2} variant="caption" color="textSecondary">
          {mergeMode
            ? "Select 2 topics to merge:"
            : deleteMode
              ? "Select topic to delete:"
              : splitMode
                ? "Select topic to split:"
                : "Click topic to higlight corresponding documents:"}
        </Typography>
        <List sx={{ width: "100%" }} disablePadding>
          {vis.data?.topics.map((topic, index) => {
            const colors = colorSchemes[colorSchemeName];
            return (
              <ListItem
                key={topic.id}
                // secondaryAction={
                //   <IconButton edge="end" aria-label="comments">
                //     <CommentIcon />
                //   </IconButton>
                // }
                disablePadding
              >
                <ListItemButton
                  selected={highlightedTopicId === topic.id}
                  role={undefined}
                  dense
                  onClick={handleTopicClick(topic.id)}
                >
                  <ListItemIcon>
                    {selectType == "single" ? (
                      <Radio edge="start" checked={choosen === topic.id} tabIndex={-1} disableRipple />
                    ) : selectType == "multi" ? (
                      <Checkbox edge="start" checked={checked.includes(topic.id)} tabIndex={-1} disableRipple />
                    ) : (
                      <Box width={42} height={42} display="flex" alignItems="center" justifyContent="flex-start">
                        {getIconComponent(Icon.TOPIC, { style: { color: colors[index % colors.length] } })}
                      </Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primary={topic.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        <Box px={2}>
          <Alert severity="info">
            Tipp: Changing document&harr;topic assignments updates the affected topics (name, description, words, etc.)!
          </Alert>
        </Box>
      </Stack>
    </Box>
  );
}

export default ColorSettings;
