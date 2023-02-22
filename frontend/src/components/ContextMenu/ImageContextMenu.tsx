import { forwardRef, useImperativeHandle, useState } from "react";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAppDispatch } from "../../plugins/ReduxHooks";
import { SearchActions } from "../../views/search/searchSlice";
import { createImageFilter } from "../../views/search/SearchFilter";
import { useNavigate } from "react-router-dom";
import { DocType } from "../../api/openapi";

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

  const closeContextMenu = (reason?: "backdropClick" | "escapeKeyDown") => {
    setIsPopoverOpen(false);
  };

  // ui events
  const handleContextMenu = (event: any) => {
    event.preventDefault();
    closeContextMenu("backdropClick");
  };

  const handleSentenceSimilaritySearch = () => {
    dispatch(SearchActions.setResultModalites([DocType.TEXT]));
    dispatch(SearchActions.addFilter(createImageFilter(image!)));
    closeContextMenu();
    navigate("../search");
  };

  const handleImageSimilaritySearch = () => {
    dispatch(SearchActions.setResultModalites([DocType.IMAGE]));
    dispatch(SearchActions.addFilter(createImageFilter(image!)));
    closeContextMenu();
    navigate("../search");
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={(event, reason) => closeContextMenu(reason)}
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
        <ListItem disablePadding>
          <ListItemButton onClick={handleSentenceSimilaritySearch} disabled={!image}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar sentences" />
          </ListItemButton>
        </ListItem>
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