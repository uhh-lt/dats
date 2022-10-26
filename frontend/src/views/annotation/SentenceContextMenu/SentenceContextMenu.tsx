import { forwardRef, useImperativeHandle, useState } from "react";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Popover, PopoverPosition } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../../search/searchSlice";
import { createSentenceFilter } from "../../search/SearchFilter";
import { useNavigate } from "react-router-dom";

interface SentenceContextMenuProps {}

export interface SentenceContextMenuHandle {
  open: (position: PopoverPosition, sentence: string) => void;
  close: () => void;
}

const SentenceContextMenu = forwardRef<SentenceContextMenuHandle, SentenceContextMenuProps>(({}, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [sentence, setSentence] = useState<string>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openContextMenu,
    close: closeContextMenu,
  }));

  // methods
  const openContextMenu = (position: PopoverPosition, sentence: string) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setSentence(sentence);
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
    dispatch(SearchActions.setFindImageModality(false));
    dispatch(SearchActions.setFindTextModality(true));
    dispatch(SearchActions.addFilter(createSentenceFilter(sentence!)));
    closeContextMenu();
    navigate("../search");
  };

  const handleImageSimilaritySearch = () => {
    dispatch(SearchActions.setFindImageModality(true));
    dispatch(SearchActions.setFindTextModality(false));
    dispatch(SearchActions.addFilter(createSentenceFilter(sentence!)));
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
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleSentenceSimilaritySearch} disabled={!sentence}>
            <ListItemIcon>
              <SearchIcon />
            </ListItemIcon>
            <ListItemText primary="Find similar sentences" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleImageSimilaritySearch} disabled={!sentence}>
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

export default SentenceContextMenu;
