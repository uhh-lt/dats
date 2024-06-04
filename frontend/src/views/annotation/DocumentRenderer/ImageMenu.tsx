import ImageIcon from "@mui/icons-material/Image";
import SearchIcon from "@mui/icons-material/Search";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import { forwardRef, useImperativeHandle, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOpenSnackbar } from "../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";

interface ImageMenuProps {}

export interface ImageMenuHandle {
  open: (position: PopoverPosition, image: number | null | undefined) => void;
  close: () => void;
}

// eslint-disable-next-line no-empty-pattern
const ImageMenu = forwardRef<ImageMenuHandle, ImageMenuProps>(({}, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [image, setImage] = useState<number | null | undefined>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (position: PopoverPosition, image: number | null | undefined) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setImage(image);
  };

  const closeMenu = () => {
    setIsPopoverOpen(false);
  };

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // ui events
  const handleImageSimilaritySearch = () => {
    if (image === undefined || image === null) {
      // We're fucked
      openSnackbar({
        severity: "error",
        text: "Something went wrong. This is a bug, please report it to the developers.",
      });
      return;
    }
    dispatch(ImageSearchActions.onChangeSearchQuery(image));
    closeMenu();
    navigate("../imagesearch");
  };

  return (
    <Popover
      open={isPopoverOpen}
      onClose={() => closeMenu()}
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
    >
      <List dense>
        <ListItem disablePadding>
          <ListItemButton component={Link} to={`../annotation/${image}`}>
            <ListItemIcon>
              <ImageIcon />
            </ListItemIcon>
            <ListItemText primary="Open image" />
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

export default ImageMenu;
