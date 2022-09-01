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
import React, { useEffect, useMemo, useState } from "react";
import LabelIcon from "@mui/icons-material/Label";
import SearchIcon from "@mui/icons-material/Search";
import { useParams } from "react-router-dom";
import { flatMap, isEqual } from "lodash";
import SnackbarAPI from "../../../../features/snackbar/SnackbarAPI";
import TagCreationButton from "../TagCreate/TagCreationButton";
import TagManageButton from "../TagManage/TagManageButton";
import { DocumentTagRead } from "../../../../api/openapi";
import ProjectHooks from "../../../../api/ProjectHooks";
import SdocHooks from "../../../../api/SdocHooks";
import { QueryKey } from "../../../../api/QueryKey";
import { useAppSelector } from "../../../../plugins/ReduxHooks";
import TagHooks from "../../../../api/TagHooks";
import { useQueryClient } from "@tanstack/react-query";

export enum CheckboxState {
  NOT_CHECKED,
  CHECKED,
  INDETERMINATE,
}

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

  // redux
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);

  // the document ids we manipulate are either the forced sdocId, the selected documents, or the currently viewed document
  const documentIds = useMemo(() => {
    if (forceSdocId) {
      return [forceSdocId];
    }
    return selectedDocumentIds.length > 0 ? selectedDocumentIds : [parseInt(sdocId!)];
  }, [forceSdocId, selectedDocumentIds, sdocId]);

  // queries
  const allTags = ProjectHooks.useGetAllTags(projId);
  const documentsTags = SdocHooks.useGetAllDocumentsTags(documentIds);

  // mutations
  const queryClient = useQueryClient();
  const updateTagsMutation = TagHooks.useBulkUpdateDocumentTags({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.sourceDocumentIds.forEach((sdocId) => {
        queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
      });
      queryClient.invalidateQueries([QueryKey.SEARCH_RESULTS]);
      queryClient.invalidateQueries([QueryKey.SDOCS_DOCUMENT_TAGS, variables.sourceDocumentIds]);
      SnackbarAPI.openSnackbar({
        text: `Updated tags!`,
        severity: "success",
      });
    },
  });
  const addTagsMutation = TagHooks.useBulkLinkDocumentTags({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
      });
      queryClient.invalidateQueries([QueryKey.SEARCH_RESULTS]);
      queryClient.invalidateQueries([QueryKey.SDOCS_DOCUMENT_TAGS, variables.requestBody.source_document_ids]);
      SnackbarAPI.openSnackbar({
        text: `Added tags!`,
        severity: "success",
      });
    },
  });
  const removeTagsMutation = TagHooks.useBulkUnlinkDocumentTags({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries([QueryKey.SDOC_TAGS, sdocId]);
      });
      queryClient.invalidateQueries([QueryKey.SEARCH_RESULTS]);
      queryClient.invalidateQueries([QueryKey.SDOCS_DOCUMENT_TAGS, variables.requestBody.source_document_ids]);
      SnackbarAPI.openSnackbar({
        text: `Removed tags!`,
        severity: "success",
      });
    },
  });

  // state
  const open = Boolean(anchorEl);

  const [search, setSearch] = useState<string>("");
  const [checked, setChecked] = React.useState<Map<number, CheckboxState>>(new Map<number, CheckboxState>());

  // computed state
  const filteredTags: DocumentTagRead[] | undefined = useMemo(() => {
    return allTags.data?.filter((tag) => tag.title.toLowerCase().startsWith(search.toLowerCase()));
  }, [allTags.data, search]);

  const initialCheckedTags = useMemo(() => {
    let result: Map<number, CheckboxState> = new Map<number, CheckboxState>();
    if (allTags.data && documentsTags.data) {
      const maxTags = documentsTags.data.length;
      // init map with all tags
      const m = new Map<number, number>(allTags.data.map((t) => [t.id, 0]));
      // convert list of list of DocumentTags to list of DocumentTagIds
      const x = flatMap(documentsTags.data, (docTagList: DocumentTagRead[]) => docTagList.map((t) => t.id));
      // count the DocumentTagIds
      x.forEach((docTagId) => {
        m.set(docTagId, (m.get(docTagId) || 0) + 1);
      });
      // Depending on the count, set the CheckboxState
      result = new Map(
        Array.from(m).map(([docTagId, docTagCount]) => [
          docTagId,
          docTagCount === 0
            ? CheckboxState.NOT_CHECKED
            : docTagCount < maxTags
            ? CheckboxState.INDETERMINATE
            : CheckboxState.CHECKED,
        ])
      );
    }
    return result;
  }, [documentsTags.data, allTags.data]);

  // check all tags once document tags are loaded!
  useEffect(() => {
    setChecked(new Map(initialCheckedTags));
  }, [initialCheckedTags]);

  // actions
  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleCheck = (tagId: number) => {
    setChecked(
      new Map(
        checked.set(
          tagId,
          checked.get(tagId) === CheckboxState.NOT_CHECKED || checked.get(tagId) === CheckboxState.INDETERMINATE
            ? CheckboxState.CHECKED
            : CheckboxState.NOT_CHECKED
        )
      )
    );
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };
  const handleClickTag = (tagId: number) => {
    if (initialCheckedTags.get(tagId) === CheckboxState.CHECKED) {
      removeTagsMutation.mutate({
        requestBody: {
          source_document_ids: documentIds,
          document_tag_ids: [tagId],
        },
      });
    } else {
      addTagsMutation.mutate({
        requestBody: {
          source_document_ids: documentIds,
          document_tag_ids: [tagId],
        },
      });
    }
  };
  const handleApplyTags = () => {
    updateTagsMutation.mutate({
      sourceDocumentIds: documentIds,
      initialState: initialCheckedTags,
      newState: checked,
    });
  };

  // Display buttons depending on state
  const hasChanged = useMemo(() => !isEqual(initialCheckedTags, checked), [initialCheckedTags, checked]);
  const actionMenu: React.ReactNode[] = [];
  if (hasChanged) {
    actionMenu.push(
      <ListItem disablePadding dense key={"apply"}>
        <ListItemButton onClick={handleApplyTags} dense disabled={updateTagsMutation.isLoading}>
          <Typography align={"center"} sx={{ width: "100%" }}>
            Anwenden
          </Typography>
        </ListItemButton>
      </ListItem>
    );
  }

  if (search.trim().length === 0 && !hasChanged) {
    actionMenu.push(<TagCreationButton tagName={search} dense key={"create-new"} />);
    actionMenu.push(<TagManageButton dense key={"manage"} />);
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
            placeholder="Label hinzufügen..."
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
                    checked={checked.get(tag.id) === CheckboxState.CHECKED}
                    indeterminate={checked.get(tag.id) === CheckboxState.INDETERMINATE}
                    tabIndex={-1}
                    disableRipple
                    disabled={!documentsTags.isSuccess}
                    inputProps={{ "aria-labelledby": labelId }}
                    style={{ padding: "0 8px 0 0" }}
                  />
                }
              >
                <ListItemButton onClick={() => handleClickTag(tag.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    <LabelIcon />
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
