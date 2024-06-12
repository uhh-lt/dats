import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SearchIcon from "@mui/icons-material/Search";
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
import React, { forwardRef, useImperativeHandle, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SpanAnnotationReadResolved } from "../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import MemoListItemButton from "../../../components/Memo/MemoListItemButton.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "../../search/ImageSearch/imageSearchSlice.ts";
import { SentenceSearchActions } from "../../search/SentenceSearch/sentenceSearchSlice.ts";
import { SearchFilterActions } from "../../search/searchFilterSlice.ts";
interface SentenceMenuProps {}

export interface SentenceMenuHandle {
  open: (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationReadResolved[] | undefined,
  ) => void;
  close: () => void;
}

// eslint-disable-next-line no-empty-pattern
const SentenceMenu = forwardRef<SentenceMenuHandle, SentenceMenuProps>(({}, ref) => {
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
    open: openMenu,
    close: closeMenu,
  }));

  // methods
  const openMenu = (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationReadResolved[] | undefined,
  ) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setSentence(sentence);
    setAnnotations(annotations);
  };

  const closeMenu = () => {
    setIsPopoverOpen(false);
  };

  // ui events
  const handleSentenceSimilaritySearch = () => {
    closeMenu();
    dispatch(SentenceSearchActions.onSearchQueryChange(sentence || ""));
    dispatch(SentenceSearchActions.onClearRowSelection());
    closeMenu();
    navigate("../sentencesearch");
  };

  const handleImageSimilaritySearch = () => {
    dispatch(ImageSearchActions.onChangeSearchQuery(sentence || ""));
    dispatch(ImageSearchActions.clearSelectedDocuments());
    closeMenu();
    navigate("../imagesearch");
  };

  const handleAddFilter = (anno: SpanAnnotationReadResolved) => {
    dispatch(
      SearchFilterActions.onAddSpanAnnotationFilter({
        codeId: anno.code.id,
        spanText: anno.span_text,
        filterName: "root",
      }),
    );
    closeMenu();
    navigate("../search");
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
            <React.Fragment key={anno.id}>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleAddFilter(anno)}>
                  <ListItemIcon>
                    <FilterAltIcon />
                  </ListItemIcon>
                  <ListItemText primary="Filter: " />
                  <Box
                    style={{ width: 20, height: 20, backgroundColor: anno.code.color, marginRight: 8, marginLeft: 16 }}
                  />
                  <ListItemText primary={`${anno.code.name}: ${anno.span_text}`} />
                </ListItemButton>
              </ListItem>
              <MemoListItemButton
                onClick={() => closeMenu()}
                attachedObjectId={anno.id}
                attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                content={
                  <>
                    <ListItemText primary="Memo: " />
                    <Box
                      style={{ width: 20, height: 20, backgroundColor: anno.code.color, marginRight: 8, marginLeft: 8 }}
                    />
                    <ListItemText primary={`${anno.code.name}: ${anno.span_text}`} />
                  </>
                }
              />
            </React.Fragment>
          ))}
      </List>
    </Popover>
  );
});

export default SentenceMenu;
