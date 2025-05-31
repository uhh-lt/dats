import {
  Box,
  Checkbox,
  Divider,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverOrigin,
  TextField,
  Typography,
} from "@mui/material";
import { isEqual } from "lodash";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TMDoc } from "../../api/openapi/models/TMDoc.ts";
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";
import { TopicRead } from "../../api/openapi/models/TopicRead.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { CheckboxState } from "../../components/Tag/TagMenu/CheckboxState.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";

interface TopicMenuProps {
  aspectId: number;
  popoverOrigin: PopoverOrigin | undefined;
  anchorEl: HTMLElement | null;
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  sdocIds: number[];
  colorScheme: string[];
}

function TopicMenu(props: TopicMenuProps) {
  // global server state (react-query)
  const vis = TopicModellingHooks.useGetDocVisualization(props.aspectId);
  const initialChecked: Map<number, CheckboxState> | undefined = useMemo(() => {
    if (!vis.data) return undefined;

    const sdocId2doc = vis.data.docs.reduce(
      (acc, doc) => {
        acc[doc.sdoc_id] = doc;
        return acc;
      },
      {} as Record<number, TMDoc>,
    );

    // init topic counts
    const topicCounts: Record<number, number> = vis.data.topics.reduce(
      (acc, topic) => {
        acc[topic.id] = 0;
        return acc;
      },
      {} as Record<number, number>,
    );

    // fill topics counts
    props.sdocIds.forEach((sdocId) => {
      const doc = sdocId2doc[sdocId];
      topicCounts[doc.topic_id] = (topicCounts[doc.topic_id] || 0) + 1;
    });

    // Depending on the count, set the CheckboxState
    const maxTags = props.sdocIds.length;
    return new Map(
      Object.entries(topicCounts).map(([topicId, topicCount]) => [
        parseInt(topicId),
        topicCount === 0
          ? CheckboxState.NOT_CHECKED
          : topicCount < maxTags
            ? CheckboxState.INDETERMINATE
            : CheckboxState.CHECKED,
      ]),
    );
  }, [vis.data, props.sdocIds]);

  if (!vis.data || !initialChecked) {
    return null;
  }
  return <TopicMenuContent topics={vis.data.topics} initialChecked={initialChecked} {...props} />;
}

function TopicMenuContent({
  aspectId,
  sdocIds,
  anchorEl,
  setAnchorEl,
  popoverOrigin,
  topics,
  initialChecked,
  colorScheme,
}: { topics: TopicRead[]; initialChecked: Map<number, CheckboxState> } & TopicMenuProps) {
  // menu state
  const open = Boolean(anchorEl);
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  // checkbox state
  const [checked, setChecked] = useState<Map<number, CheckboxState>>(new Map());
  useEffect(() => {
    setChecked(new Map(initialChecked));
  }, [initialChecked]);
  const hasChanged = useMemo(() => !isEqual(initialChecked, checked), [initialChecked, checked]);
  const hasNoChecked = useMemo(
    () => Array.from(checked.values()).every((state) => state === CheckboxState.NOT_CHECKED),
    [checked],
  );
  const handleCheck = (topicId: number) => () => {
    setChecked((checked) => {
      const newCheckStatus =
        checked.get(topicId) === CheckboxState.CHECKED ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED;
      return new Map(
        topics.map((topic) => {
          if (topic.id !== topicId) {
            return [topic.id, CheckboxState.NOT_CHECKED];
          } else {
            return [topic.id, newCheckStatus];
          }
        }),
      );
    });
  };

  // filter feature
  const [search, setSearch] = useState<string>("");
  const filteredTopicIndexes: number[] = useMemo(() => {
    return topics
      .map((topic, index) => (topic.name.toLowerCase().startsWith(search.toLowerCase()) ? index : -1))
      .filter((index) => index !== -1);
  }, [topics, search]);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  // actions
  const { mutate: startTMJobMutation, isPending } = TopicModellingHooks.useStartTMJob();
  const handleApplyTags = useCallback(() => {
    // find entry where CheckboxState is Checked
    const checkedTopics = Object.entries(checked).filter(([, state]) => state === CheckboxState.CHECKED);
    if (checkedTopics.length > 1) {
      console.error("Expected at most one topic to be checked, but found:", checkedTopics.length);
      return;
    }
    startTMJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          tm_job_type: TMJobType.CHANGE_TOPIC,
          topic_id: checkedTopics.length === 1 ? parseInt(checkedTopics[0][0]) : -1, // -1 means "no topic / outlier",
          sdoc_ids: sdocIds,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [aspectId, checked, handleClose, sdocIds, startTMJobMutation]);
  const handleCreateTopic = useCallback(() => {
    startTMJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          tm_job_type: TMJobType.CREATE_TOPIC_WITH_SDOCS,
          sdoc_ids: sdocIds,
        },
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [aspectId, startTMJobMutation, handleClose, sdocIds]);

  // Display buttons depending on state
  const actionMenu: React.ReactNode = useMemo(() => {
    if (hasChanged) {
      return (
        <ListItem disablePadding dense key={"apply"}>
          <ListItemButton onClick={handleApplyTags} dense disabled={isPending}>
            <Typography align={"center"} sx={{ width: "100%" }}>
              {hasNoChecked ? "Mark as outlier (removing docs)" : "Set to new topic"}
            </Typography>
          </ListItemButton>
        </ListItem>
      );
    } else if (
      search.trim().length === 0 ||
      (search.trim().length > 0 &&
        filteredTopicIndexes.map((index) => topics[index].name).indexOf(search.trim()) === -1)
    ) {
      return (
        <ListItemButton onClick={handleCreateTopic}>
          <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
          <ListItemText primary={search.length > 0 ? `"${search}" (Create new)` : "Create new topic"} />
        </ListItemButton>
      );
    }
    return null;
  }, [filteredTopicIndexes, handleApplyTags, handleCreateTopic, hasChanged, hasNoChecked, isPending, search, topics]);

  return (
    <Popover
      id="topic-menu"
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={popoverOrigin}
      slotProps={{
        paper: {
          elevation: 1,
        },
      }}
    >
      <List>
        <ListItem>
          <TextField
            value={search}
            autoFocus
            onChange={handleSearchChange}
            variant="standard"
            fullWidth
            placeholder="Search topic..."
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">{getIconComponent(Icon.SEARCH)}</InputAdornment>,
              },
            }}
          />
        </ListItem>

        <Divider />

        <Box sx={{ maxHeight: "240px", overflowY: "auto" }}>
          {filteredTopicIndexes.map((index) => {
            const topic = topics[index];
            const labelId = `tag-menu-list-label-${topic.name}`;

            return (
              <ListItem
                key={topic.id}
                disablePadding
                dense
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={handleCheck(topic.id)}
                    checked={checked.get(topic.id) === CheckboxState.CHECKED}
                    indeterminate={checked.get(topic.id) === CheckboxState.INDETERMINATE}
                    tabIndex={-1}
                    disableRipple
                    slotProps={{
                      input: {
                        "aria-labelledby": labelId,
                      },
                    }}
                    style={{ padding: "0 8px 0 0" }}
                  />
                }
              >
                <ListItemButton onClick={handleCheck(topic.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    {getIconComponent(Icon.TOPIC, { style: { color: colorScheme[index % colorScheme.length] } })}
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={topic.name} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>

        {actionMenu && <Divider />}
        {actionMenu}
      </List>
    </Popover>
  );
}

export default TopicMenu;
