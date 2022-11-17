import { forwardRef, useImperativeHandle, useState } from "react";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popover,
  PopoverPosition,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { useAppDispatch } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../../search/searchSlice";
import { createCodeFilter, createSentenceFilter } from "../../search/SearchFilter";
import { useNavigate } from "react-router-dom";
import { SpanAnnotationReadResolved } from "../../../api/openapi";

interface SentenceContextMenuProps {}

export interface SentenceContextMenuHandle {
  open: (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationReadResolved[] | undefined
  ) => void;
  close: () => void;
}

const SentenceContextMenu = forwardRef<SentenceContextMenuHandle, SentenceContextMenuProps>(({}, ref) => {
  const navigate = useNavigate();

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [sentence, setSentence] = useState<string>();
  const [annotations, setAnnotations] = useState<SpanAnnotationReadResolved[]>();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openContextMenu,
    close: closeContextMenu,
  }));

  // methods
  const openContextMenu = (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationReadResolved[] | undefined
  ) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setSentence(sentence);
    setAnnotations(annotations);
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

  const handleAddFilter = (anno: SpanAnnotationReadResolved) => {
    dispatch(SearchActions.addFilter(createCodeFilter(anno.code.id, anno.span_text)));
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
        {annotations &&
          annotations.map((anno) => (
            <ListItem key={anno.id} disablePadding>
              <ListItemButton onClick={() => handleAddFilter(anno)}>
                <ListItemIcon>
                  <SearchIcon />
                </ListItemIcon>
                <ListItemText primary="Add filter: " />
                <Box
                  style={{ width: 20, height: 20, backgroundColor: anno.code.color, marginRight: 8, marginLeft: 8 }}
                />
                <ListItemText primary={`${anno.code.name}: ${anno.span_text}`} />
              </ListItemButton>
            </ListItem>
          ))}
      </List>
    </Popover>
  );
});

export default SentenceContextMenu;