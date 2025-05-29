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

    const topicCounts: Record<number, number> = props.sdocIds.reduce(
      (acc, sdocId) => {
        const doc = sdocId2doc[sdocId];
        acc[doc.topic_id] = (acc[doc.topic_id] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
    console.log("Topic counts:", topicCounts);

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
  const handleCheck = (topicId: number) => () => {
    setChecked(
      (checked) =>
        new Map(
          checked.set(
            topicId,
            checked.get(topicId) === CheckboxState.CHECKED ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED,
          ),
        ),
    );
  };

  // filter feature
  const [search, setSearch] = useState<string>("");
  const filteredTopics: TopicRead[] | undefined = useMemo(() => {
    return topics.filter((topic) => topic.name.toLowerCase().startsWith(search.toLowerCase()));
  }, [topics, search]);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  // actions
  const { mutate: setTopicMutation, isPending } = TopicModellingHooks.useSetTopic();
  const handleClickTopic = (topicId: number) => () => {
    setTopicMutation(
      {
        aspectId: aspectId,
        topicId: topicId,
        requestBody: sdocIds,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  };

  const handleApplyTags = useCallback(() => {
    // find entry where CheckboxState is Checked
    const checkedTopics = Object.entries(checked).filter(([, state]) => state === CheckboxState.CHECKED);
    if (checkedTopics.length !== 1) {
      console.error("Expected exactly one topic to be checked, but found:", checkedTopics.length);
      return;
    }

    setTopicMutation(
      {
        aspectId: aspectId,
        topicId: parseInt(checkedTopics[0][0]),
        requestBody: sdocIds,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [aspectId, checked, handleClose, sdocIds, setTopicMutation]);

  // Display buttons depending on state
  const actionMenu: React.ReactNode = useMemo(() => {
    if (hasChanged) {
      return (
        <ListItem disablePadding dense key={"apply"}>
          <ListItemButton onClick={handleApplyTags} dense disabled={isPending}>
            <Typography align={"center"} sx={{ width: "100%" }}>
              Apply
            </Typography>
          </ListItemButton>
        </ListItem>
      );
    } else if (
      search.trim().length === 0 ||
      (search.trim().length > 0 && filteredTopics.map((tag) => tag.name).indexOf(search.trim()) === -1)
    ) {
      return <ListItemButton>DO SOMETHING!</ListItemButton>;
    }
    return null;
  }, [filteredTopics, handleApplyTags, hasChanged, isPending, search]);

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
          {filteredTopics.map((topic) => {
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
                <ListItemButton onClick={handleClickTopic(topic.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    {getIconComponent(Icon.TOPIC, { style: { color: topic.color } })}
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
