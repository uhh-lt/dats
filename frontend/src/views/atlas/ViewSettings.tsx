import {
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
  Typography,
} from "@mui/material";
import { useState } from "react";
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { AtlasActions } from "./atlasSlice.ts";
import TopicCreationDialog from "./TopicCreationDialog.tsx";

interface ViewSettingsProps {
  aspectId: number;
}

function ViewSettings({ aspectId }: ViewSettingsProps) {
  // view settings
  const colorBy = useAppSelector((state) => state.atlas.colorBy);
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);
  const pointSize = useAppSelector((state) => state.atlas.pointSize);
  const showLabels = useAppSelector((state) => state.atlas.showLabels);

  // event handlers
  const dispatch = useAppDispatch();
  const handleColorByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeColorBy(event.target.value));
  };
  const handleColorSchemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(AtlasActions.onChangeColorScheme(event.target.value));
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
  const selectedTopicId = useAppSelector((state) => state.atlas.selectedTopicId);
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

  // splitting
  const [splitMode, setSplitMode] = useState(false);
  const handleToggleSplitMode = () => {
    setSplitMode((prev) => !prev);
    setChoosen(undefined);
  };
  const handleConfirmSplit = () => {
    if (choosen === undefined) return;
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
          <MenuItem value="name">Topics: Broad</MenuItem>
          <MenuItem value="creationDate">Topics: Medium</MenuItem>
          <MenuItem value="size">Topics: Fine</MenuItem>
        </TextField>
        <TextField
          select
          label="Color scheme"
          value={colorScheme}
          onChange={handleColorSchemeChange}
          size="small"
          variant="outlined"
        >
          <MenuItem value="default">Default</MenuItem>
          <MenuItem value="viridis">Viridis</MenuItem>
          <MenuItem value="plasma">Plasma</MenuItem>
          <MenuItem value="inferno">Inferno</MenuItem>
          <MenuItem value="magma">Magma</MenuItem>
          <MenuItem value="cividis">Cividis</MenuItem>
          <MenuItem value="turbo">Turbo</MenuItem>
          <MenuItem value="cubehelix">Cubehelix</MenuItem>
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
              <Button onClick={handleToggleDeleteMode} disabled={isPending}>
                Remove Topic
              </Button>
              <Button onClick={handleToggleSplitMode} disabled={isPending}>
                Split Topic
              </Button>
              <Button onClick={handleToggleMergeMode} disabled={isPending}>
                Merge Topics
              </Button>
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
          {vis.data?.topics.map((topic) => {
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
                  selected={selectedTopicId === topic.id}
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
                        {getIconComponent(Icon.TOPIC, { style: { color: topic.color } })}
                      </Box>
                    )}
                  </ListItemIcon>
                  <ListItemText primary={topic.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Stack>
    </Box>
  );
}

export default ViewSettings;
