import { TagHooks } from "@api/hooks/TagHooks";
import { Icon, getIconComponent } from "@components/icons";
import { TagRead } from "@models/TagRead";
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
import { CheckboxState } from "@utils/CheckboxState";
import { isEqual } from "lodash";
import { Dispatch, SetStateAction, useCallback, useMemo, useState } from "react";
import { TagCreateListItemButton } from "../../dialog";

interface TagMenuProps {
  popoverOrigin: PopoverOrigin | undefined;
  anchorEl: HTMLElement | null;
  setAnchorEl: Dispatch<SetStateAction<HTMLElement | null>>;
  projectId: number;
  sdocIds: number[];
}

export function TagMenu(props: TagMenuProps) {
  // global server state (react-query)
  const allTags = TagHooks.useGetAllTags();
  const tagCounts = TagHooks.useGetTagDocumentCounts(props.projectId, props.sdocIds);
  const initialChecked: Record<number, CheckboxState> | undefined = useMemo(() => {
    if (!tagCounts.data) return undefined;

    // Depending on the count, set the CheckboxState
    const maxTags = props.sdocIds.length;
    return Object.fromEntries(
      Array.from(tagCounts.data).map(([docTagId, docTagCount]) => [
        docTagId,
        docTagCount === 0
          ? CheckboxState.NOT_CHECKED
          : docTagCount < maxTags
            ? CheckboxState.INDETERMINATE
            : CheckboxState.CHECKED,
      ]),
    );
  }, [tagCounts.data, props.sdocIds]);

  if (!allTags.data || !initialChecked) {
    return null;
  }

  // When the popover is opened again, react destroys the old content component and mounts a fresh one.
  const componentKey = props.anchorEl ? "open" : "closed";
  return <TagMenuContent key={componentKey} tags={allTags.data} initialChecked={initialChecked} {...props} />;
}

function TagMenuContent({
  sdocIds,
  anchorEl,
  setAnchorEl,
  popoverOrigin,
  tags,
  initialChecked,
}: { tags: TagRead[]; initialChecked: Record<number, CheckboxState> } & TagMenuProps) {
  // menu state
  const open = Boolean(anchorEl);
  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, [setAnchorEl]);

  // checkbox state
  const [checked, setChecked] = useState<Record<number, CheckboxState>>(() => ({ ...initialChecked }));
  const hasChanged = useMemo(() => !isEqual(initialChecked, checked), [initialChecked, checked]);

  const handleCheck = (tagId: number) => () => {
    setChecked((prevChecked) => ({
      ...prevChecked,
      [tagId]: prevChecked[tagId] === CheckboxState.CHECKED ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED,
    }));
  };

  // filter feature
  const [search, setSearch] = useState<string>("");
  const filteredTags: TagRead[] | undefined = useMemo(() => {
    return tags.filter((tag) => tag.name.toLowerCase().startsWith(search.toLowerCase()));
  }, [tags, search]);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  // actions
  const { mutate: addTagsMutation } = TagHooks.useBulkLinkTags();
  const { mutate: removeTagsMutation } = TagHooks.useBulkUnlinkTags();
  const handleClickTag = (tagId: number) => () => {
    const isChecked = checked[tagId] === CheckboxState.CHECKED;
    setChecked((prevChecked) => ({
      ...prevChecked,
      [tagId]: isChecked ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED,
    }));

    if (isChecked) {
      removeTagsMutation({
        requestBody: {
          source_document_ids: sdocIds,
          tag_ids: [tagId],
        },
      });
    } else {
      addTagsMutation({
        requestBody: {
          source_document_ids: sdocIds,
          tag_ids: [tagId],
        },
      });
    }
    handleClose();
  };

  const { mutate: updateTagsMutation, isPending: isUpdatePending } = TagHooks.useBulkUpdateTags();
  const handleApplyTags = useCallback(() => {
    const checkedEntries = Object.entries(checked);
    updateTagsMutation({
      requestBody: {
        sdoc_ids: sdocIds,
        link_tag_ids: checkedEntries
          .filter(([, state]) => state === CheckboxState.CHECKED)
          .map(([tagId]) => Number(tagId)),
        unlink_tag_ids: checkedEntries
          .filter(([, state]) => state === CheckboxState.NOT_CHECKED)
          .map(([tagId]) => Number(tagId)),
      },
    });
    handleClose();
  }, [checked, handleClose, sdocIds, updateTagsMutation]);

  // Display buttons depending on state
  const actionMenu: React.ReactNode = useMemo(() => {
    if (hasChanged) {
      return (
        <ListItem disablePadding dense key={"apply"}>
          <ListItemButton onClick={handleApplyTags} dense disabled={isUpdatePending}>
            <Typography align={"center"} sx={{ width: "100%" }}>
              Apply
            </Typography>
          </ListItemButton>
        </ListItem>
      );
    } else if (
      search.trim().length === 0 ||
      (search.trim().length > 0 && filteredTags.map((tag) => tag.name).indexOf(search.trim()) === -1)
    ) {
      return <TagCreateListItemButton tagName={search} dense key={"create-new"} />;
    }
    return null;
  }, [filteredTags, handleApplyTags, hasChanged, isUpdatePending, search]);

  return (
    <Popover
      id="tag-menu"
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
            placeholder="Add tag..."
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">{getIconComponent(Icon.SEARCH)}</InputAdornment>,
              },
            }}
          />
        </ListItem>

        <Divider />

        <Box sx={{ maxHeight: "240px", overflowY: "auto" }}>
          {filteredTags.map((tag) => {
            const labelId = `tag-menu-list-label-${tag.name}`;

            return (
              <ListItem
                key={tag.id}
                disablePadding
                dense
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={handleCheck(tag.id)}
                    checked={checked[tag.id] === CheckboxState.CHECKED}
                    indeterminate={checked[tag.id] === CheckboxState.INDETERMINATE}
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
                <ListItemButton onClick={handleClickTag(tag.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    {getIconComponent(Icon.TAG, { style: { color: tag.color } })}
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={tag.name} />
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
