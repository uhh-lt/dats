import SearchIcon from "@mui/icons-material/Search";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOpenSnackbar } from "../../../features/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";

interface ImageContextMenuProps {}

export interface ImageContextMenuHandle {
  open: (position: PopoverPosition, image: number | undefined) => void;
  close: () => void;
}

// eslint-disable-next-line no-empty-pattern
const ImageContextMenu = forwardRef<ImageContextMenuHandle, ImageContextMenuProps>(({}, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [image, setImage] = useState<number>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openContextMenu,
    close: closeContextMenu,
  }));

  // methods
  const openContextMenu = (position: PopoverPosition, image: number | undefined) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setImage(image);
  };

  const closeContextMenu = () => {
    setIsPopoverOpen(false);
  };

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // ui events
  const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    closeContextMenu();
  };

  const handleImageSimilaritySearch = () => {
    if (image === undefined) {
      // We're fucked
      openSnackbar({
        severity: "error",
        text: "Something went wrong. This is a bug, please report it to the developers.",
      });
      return;
    }
    dispatch(ImageSearchActions.onChangeSearchQuery(image));
    closeContextMenu();
    navigate("../imagesearch");
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={() => closeContextMenu()}
      anchorPosition={position}
      anchorReference="anchorPosition"
      anchorOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      onContextMenu={handleContextMenu}
    >
      <List dense>
        {/* <ListItem disablePadding>
          <ListItemButton onClick={handleSentenceSimilaritySearch} disabled={!image}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar sentences" />
          </ListItemButton>
        </ListItem> */}
        <ListItem disablePadding>
          <ListItemButton onClick={handleImageSimilaritySearch} disabled={!image}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar images" />
          </ListItemButton>
        </ListItem>
      </List>
    </Popover>
  );
});

export default ImageContextMenu;
