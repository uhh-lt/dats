import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
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
} from "@mui/material";
import { isEqual } from "lodash";
import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useState } from "react";
import { FolderHooks } from "../../../../api/FolderHooks.ts";
import { FolderRead } from "../../../../api/openapi/models/FolderRead.ts";
import { FolderType } from "../../../../api/openapi/models/FolderType.ts";
import { CheckboxState } from "../../../../utils/CheckboxState.ts";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";
import { FolderCreateButton } from "../../dialog/FolderCreateButton.tsx";

interface FolderMenuProps {
  popoverOrigin: PopoverOrigin | undefined;
  anchorEl: HTMLElement | null;
  setAnchorEl: Dispatch<SetStateAction<HTMLElement | null>>;
  folderIds: number[];
}

export function FolderActionMenu(props: FolderMenuProps) {
  // global server state (react-query)
  const allFolders = FolderHooks.useGetAllFolders();
  const allFoldersWithRoot: FolderRead[] | undefined = useMemo(() => {
    if (!allFolders.data) return undefined;
    // Add a root folder with id -1
    return [
      { id: -1, name: "Project", folder_type: FolderType.NORMAL, project_id: -1, created: "", updated: "" },
      ...allFolders.data,
    ];
  }, [allFolders.data]);

  const allSdocFoldersMap = FolderHooks.useGetAllSdocFoldersMap();
  const initialChecked: Map<number, CheckboxState> | undefined = useMemo(() => {
    if (!allFoldersWithRoot || !allSdocFoldersMap.data) return undefined;

    // Count parent folders:
    // all provided folderIDs must be of  type SDOC_FOLDER
    // every SDOC_FOLDER has a parent folder, which is of type NORMAL
    // we count how many SDOC_FOLDERS are in each parent folder
    const maxFolders = props.folderIds.length;
    const folderCounts = new Map(allFoldersWithRoot.map((folder) => [folder.id, 0]));
    folderCounts.set(-1, 0); // Initialize the count for the root folder
    props.folderIds.forEach((folderId) => {
      const folder = allSdocFoldersMap.data[folderId];
      if (folder) {
        const parentId = folder.parent_id || -1; // Use -1 for root if no parent
        folderCounts.set(parentId, (folderCounts.get(parentId) || 0) + 1);
      } else {
        console.error(`Folder with ID ${folderId} not found in allSdocFoldersMap.`);
      }
    });

    // Depending on the count, set the CheckboxState
    return new Map(
      Array.from(folderCounts).map(([docFolderId, docFolderCount]) => [
        docFolderId,
        docFolderCount === 0
          ? CheckboxState.NOT_CHECKED
          : docFolderCount < maxFolders
            ? CheckboxState.INDETERMINATE
            : CheckboxState.CHECKED,
      ]),
    );
  }, [allFoldersWithRoot, allSdocFoldersMap.data, props.folderIds]);

  if (!allFoldersWithRoot || !initialChecked) {
    return null;
  }
  return <FolderMenuContent folders={allFoldersWithRoot} initialChecked={initialChecked} {...props} />;
}

function FolderMenuContent({
  folderIds,
  anchorEl,
  setAnchorEl,
  popoverOrigin,
  folders,
  initialChecked,
}: { folders: FolderRead[]; initialChecked: Map<number, CheckboxState> } & FolderMenuProps) {
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
  const handleCheck = (folderId: number) => () => {
    setChecked((checked) => {
      const newCheckStatus =
        checked.get(folderId) === CheckboxState.CHECKED ? CheckboxState.NOT_CHECKED : CheckboxState.CHECKED;
      return new Map(
        folders.map((folder) => {
          if (folder.id !== folderId) {
            return [folder.id, CheckboxState.NOT_CHECKED];
          } else {
            return [folder.id, newCheckStatus];
          }
        }),
      );
    });
  };

  // filter feature
  const [search, setSearch] = useState<string>("");
  const filteredFolders: FolderRead[] | undefined = useMemo(() => {
    return folders.filter((folder) => folder.name.toLowerCase().startsWith(search.toLowerCase()));
  }, [folders, search]);
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  // actions
  const { mutate: moveFoldersMutation, isPending } = FolderHooks.useMoveFolders();
  const handleMoveToFolder = useCallback(() => {
    // find entry where CheckboxState is Checked
    const checkedFolders = Array.from(checked).filter(([, state]) => state === CheckboxState.CHECKED);
    if (checkedFolders.length !== 1) {
      console.error("Expected exactly one folder to be checked, but found:", checkedFolders.length);
      return;
    }
    moveFoldersMutation(
      {
        targetFolderId: checkedFolders[0][0],
        requestBody: folderIds,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      },
    );
  }, [checked, moveFoldersMutation, folderIds, handleClose]);

  // Display buttons depending on state
  const actionMenu: React.ReactNode = useMemo(() => {
    if (hasNoChecked) {
      return <FolderCreateButton folderName={search} dense key={"create-new"} />;
    } else if (hasChanged) {
      return (
        <ListItem disablePadding dense key={"apply"}>
          <ListItemButton onClick={handleMoveToFolder} dense disabled={isPending || hasNoChecked}>
            <ListItemIcon>
              <DriveFileMoveIcon />
            </ListItemIcon>
            <ListItemText primary="Move to folder" />
          </ListItemButton>
        </ListItem>
      );
    } else if (
      search.trim().length === 0 ||
      (search.trim().length > 0 && filteredFolders.map((folder) => folder.name).indexOf(search.trim()) === -1)
    ) {
      return <FolderCreateButton folderName={search} dense key={"create-new"} />;
    }
    return null;
  }, [filteredFolders, handleMoveToFolder, hasChanged, hasNoChecked, isPending, search]);

  return (
    <Popover
      id="folder-menu"
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
            placeholder="Add folder..."
            slotProps={{
              input: {
                endAdornment: <InputAdornment position="end">{getIconComponent(Icon.SEARCH)}</InputAdornment>,
              },
            }}
          />
        </ListItem>

        <Divider />

        <Box sx={{ maxHeight: "240px", overflowY: "auto" }}>
          {filteredFolders.map((folder) => {
            const labelId = `folder-menu-list-label-${folder.name}`;

            return (
              <ListItem
                key={folder.id}
                disablePadding
                dense
                secondaryAction={
                  <Checkbox
                    edge="end"
                    onChange={handleCheck(folder.id)}
                    checked={checked.get(folder.id) === CheckboxState.CHECKED}
                    indeterminate={checked.get(folder.id) === CheckboxState.INDETERMINATE}
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
                <ListItemButton onClick={handleCheck(folder.id)} dense>
                  <ListItemIcon sx={{ minWidth: "32px" }}>
                    {folder.id === -1 ? getIconComponent(Icon.PROJECT) : getIconComponent(Icon.FOLDER)}
                  </ListItemIcon>
                  <ListItemText id={labelId} primary={folder.name} />
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
