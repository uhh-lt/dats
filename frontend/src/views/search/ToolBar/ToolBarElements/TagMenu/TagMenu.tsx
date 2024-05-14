import LabelIcon from "@mui/icons-material/Label";
import SearchIcon from "@mui/icons-material/Search";
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
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../../../api/ProjectHooks.ts";
import TagHooks from "../../../../../api/TagHooks.ts";
import { DocumentTagRead } from "../../../../../api/openapi/models/DocumentTagRead.ts";
import SnackbarAPI from "../../../../../features/Snackbar/SnackbarAPI.ts";
import { useAppSelector } from "../../../../../plugins/ReduxHooks.ts";
import { CheckboxState } from "./CheckboxState.ts";
import TagCreationButton from "./TagMenuCreateButton.tsx";

interface TagMenuProps {
  popoverOrigin: PopoverOrigin | undefined;
  anchorEl: HTMLElement | null;
  setAnchorEl: React.Dispatch<React.SetStateAction<HTMLElement | null>>;
  forceSdocId?: number;
}

function TagMenu({ forceSdocId, anchorEl, setAnchorEl, popoverOrigin }: TagMenuProps) {
  // react router
  const { projectId, sdocId } = useParams() as { projectId: string; sdocId: string | undefined };
  const projId = parseInt(projectId);

  // global client state (redux)
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);

  // the document ids we manipulate are either the forced sdocId, the selected documents, or the currently viewed document
  const documentIds = useMemo(() => {
    if (forceSdocId) {
      return [forceSdocId];
    }
    return selectedDocumentIds.length > 0 ? selectedDocumentIds : [parseInt(sdocId!)];
  }, [forceSdocId, selectedDocumentIds, sdocId]);

  // global server state (react-query)
  const allTags = ProjectHooks.useGetAllTags(projId);
  const documentTagCounts = TagHooks.useGetTagDocumentCounts(documentIds).data;

  // mutations
  const updateTagsMutation = TagHooks.useBulkUpdateDocumentTags();
  const addTagsMutation = TagHooks.useBulkLinkDocumentTags();
  const removeTagsMutation = TagHooks.useBulkUnlinkDocumentTags();

  // state
  const open = Boolean(anchorEl);
  const [search, setSearch] = useState<string>("");
  const [checked, setChecked] = useState<Map<number, CheckboxState>>(new Map<number, CheckboxState>());

  // computed state
  const filteredTags: DocumentTagRead[] | undefined = useMemo(() => {
    return allTags.data?.filter((tag) => tag.title.toLowerCase().startsWith(search.toLowerCase()));
  }, [allTags.data, search]);

  // For each tag id, compute how the checkbox should look
  const initialCheckedTags: Map<number, CheckboxState> | undefined = useMemo(() => {
    if (allTags.data && documentTagCounts !== undefined) {
      const maxTags = documentIds.length;
      // Depending on the count, set the CheckboxState
      return new Map(
        Array.from(documentTagCounts).map(([docTagId, docTagCount]) => [
          docTagId,
          docTagCount === 0
            ? CheckboxState.NOT_CHECKED
            : docTagCount < maxTags
              ? CheckboxState.INDETERMINATE
              : CheckboxState.CHECKED,
        ]),
      );
    }
    return undefined;
  }, [documentTagCounts, allTags.data, documentIds]);

  const hasChanged = useMemo(() => !isEqual(initialCheckedTags, checked), [initialCheckedTags, checked]);

  // effects
  useEffect(() => {
    if (initialCheckedTags) {
      setChecked(new Map(initialCheckedTags));
    }
  }, [initialCheckedTags]);

  // actions
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleCheck = (tagId: number) => {
    if (!checked) return;

    setChecked(
      new Map(
        checked.set(
          tagId,
          checked.get(tagId) === CheckboxState.NOT_CHECKED || checked.get(tagId) === CheckboxState.INDETERMINATE
            ? CheckboxState.CHECKED
            : CheckboxState.NOT_CHECKED,
        ),
      ),
    );
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };
  const handleClickTag = (tagId: number) => {
    if (initialCheckedTags?.get(tagId) === CheckboxState.CHECKED) {
      removeTagsMutation.mutate(
        {
          projectId: projId,
          requestBody: {
            source_document_ids: documentIds,
            document_tag_ids: [tagId],
          },
        },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Removed tags!`,
              severity: "success",
            });
          },
        },
      );
    } else {
      addTagsMutation.mutate(
        {
          projectId: projId,
          requestBody: {
            source_document_ids: documentIds,
            document_tag_ids: [tagId],
          },
        },
        {
          onSuccess: () => {
            SnackbarAPI.openSnackbar({
              text: `Added tags!`,
              severity: "success",
            });
          },
        },
      );
    }
    handleClose();
  };
  const handleApplyTags = () => {
    if (!initialCheckedTags || !checked) return;
    updateTagsMutation.mutate(
      {
        projectId: projId,
        sourceDocumentIds: documentIds,
        initialState: initialCheckedTags,
        newState: checked,
      },
      {
        onSuccess: () => {
          SnackbarAPI.openSnackbar({
            text: `Updated tags!`,
            severity: "success",
          });
        },
      },
    );
    handleClose();
  };

  // Display buttons depending on state
  const actionMenu: React.ReactNode[] = [];
  if (hasChanged) {
    actionMenu.push(
      <ListItem disablePadding dense key={"apply"}>
        <ListItemButton onClick={handleApplyTags} dense disabled={updateTagsMutation.isPending}>
          <Typography align={"center"} sx={{ width: "100%" }}>
            Apply
          </Typography>
        </ListItemButton>
      </ListItem>,
    );
  }

  if (search.trim().length === 0 && !hasChanged) {
    actionMenu.push(<TagCreationButton tagName={search} dense key={"create-new"} />);
  } else if (
    search.trim().length > 0 &&
    !hasChanged &&
    filteredTags?.map((tag) => tag.title)?.indexOf(search.trim()) === -1
  ) {
    actionMenu.push(<TagCreationButton tagName={search} dense key={"create-new2"} />);
  }

  return (
    <Popover
      id="tag-menu"
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={popoverOrigin}
      PaperProps={{
        elevation: 1,
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </ListItem>

        <Divider />

        <Box sx={{ maxHeight: "240px", overflowY: "auto" }}>
          {filteredTags?.map((tag) => {
            const labelId = `tag-menu-list-label-${tag.title}`;

            return (
              <ListItem
                key={tag.id}
                disablePadding
                dense
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={() => handleCheck(tag.id)}
                    checked={checked?.get(tag.id) === CheckboxState.CHECKED}
                    indeterminate={checked?.get(tag.id) === CheckboxState.INDETERMINATE}
                    tabIndex={-1}
                    disableRipple
                    inputProps={{ "aria-labelledby": labelId }}
                    style={{ padding: "0 8px 0 0" }}
                  />
                }
              >
                <ListItemButton onClick={() => handleClickTag(tag.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    <LabelIcon style={{ color: tag.color }} />
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={tag.title} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </Box>

        {actionMenu.length > 0 && <Divider />}
        {actionMenu}
      </List>
    </Popover>
  );
}

export default TagMenu;
