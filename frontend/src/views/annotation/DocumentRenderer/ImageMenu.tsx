import ImageIcon from "@mui/icons-material/Image";
import SearchIcon from "@mui/icons-material/Search";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { forwardRef, useImperativeHandle, useState } from "react";
import { LinkListItemButton } from "../../../components/MUI/LinkListItemButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";

export interface ImageMenuHandle {
  open: (position: PopoverPosition, image: number | null | undefined) => void;
  close: () => void;
}

interface ImageMenuProps {
  projectId: number;
}

const ImageMenu = forwardRef<ImageMenuHandle, ImageMenuProps>((params, ref) => {
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

  // ui events
  const handleImageSimilaritySearch = () => {
    if (image === undefined || image === null) {
      console.error("Something went wrong. This is a bug, please report it to the developers.");
      return;
    }
    dispatch(ImageSearchActions.onChangeSearchQuery(`${image}`));
    closeMenu();
    navigate({ to: "/project/$projectId/imagesearch", params: { projectId: params.projectId } });
  };

  return (
    <Popover
      open={isPopoverOpen && !!image}
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
          <LinkListItemButton
            to="/project/$projectId/annotation/$sdocId"
            params={{ sdocId: image!, projectId: params.projectId }}
          >
            <ListItemIcon>
              <ImageIcon />
            </ListItemIcon>
            <ListItemText primary="Open image" />
          </LinkListItemButton>
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
