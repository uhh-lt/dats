import { LinkListItemButton } from "@components/links";
import { ImageSearchActions } from "@features/search";
import ImageIcon from "@mui/icons-material/Image";
import SearchIcon from "@mui/icons-material/Search";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { useNavigate } from "@tanstack/react-router";
import { forwardRef, useImperativeHandle, useState } from "react";

export interface ImageMenuHandle {
  open: (position: PopoverPosition, image: number | null | undefined) => void;
  close: () => void;
}

interface ImageMenuProps {
  projectId: number;
}

export const ImageMenu = forwardRef<ImageMenuHandle, ImageMenuProps>((params, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [image, setImage] = useState<number | null | undefined>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // methods
  const openMenu = (position: PopoverPosition, image: number | null | undefined) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setImage(image);
  };

  const closeMenu = () => {
    setIsPopoverOpen(false);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

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
