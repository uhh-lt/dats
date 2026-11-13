import { CodeHooks } from "@core/code";
import { useFeature } from "@core/feature";
import { MemoCreateOrSelectListItemButton } from "@core/memo";
import { useTabNavigate } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { Feature } from "@models/Feature";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
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
import { Fragment, useImperativeHandle, useState } from "react";

export interface SentenceMenuHandle {
  open: (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationRead[] | undefined,
  ) => void;
  close: () => void;
}

interface SentenceMenuProps {
  ref: React.Ref<SentenceMenuHandle>;
  projectId: number;
}

export const SentenceMenu = ({ ref, projectId }: SentenceMenuProps) => {
  const tabNavigate = useTabNavigate();

  // global server state
  const codeId2CodeMap = CodeHooks.useGetAllCodesMap();
  const sentenceSearchEnabled = useFeature(Feature.SENTENCE_SIMILARITY_SEARCH);
  const imageSearchEnabled = useFeature(Feature.IMAGE_SIMILARITY_SEARCH);
  const fullTextSearchEnabled = useFeature(Feature.FULL_TEXT_SEARCH);

  // local state
  const [position, setPosition] = useState<PopoverPosition>({ top: 0, left: 0 });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [sentence, setSentence] = useState<string>();
  const [annotations, setAnnotations] = useState<SpanAnnotationRead[]>();

  // methods
  const openMenu = (
    position: PopoverPosition,
    sentence: string | undefined,
    annotations: SpanAnnotationRead[] | undefined,
  ) => {
    setIsPopoverOpen(true);
    setPosition(position);
    setSentence(sentence);
    setAnnotations(annotations);
  };

  const closeMenu = () => {
    setIsPopoverOpen(false);
  };

  // exposed methods (via ref)
  useImperativeHandle(ref, () => ({
    open: openMenu,
    close: closeMenu,
  }));

  // without the similarity search features and annotations, the menu has no entries
  const hasEntries =
    sentenceSearchEnabled || imageSearchEnabled || (annotations !== undefined && annotations.length > 0);

  // ui events
  const handleSentenceSimilaritySearch = () => {
    closeMenu();
    tabNavigate({
      to: "/project/$projectId/sentencesearch",
      params: { projectId },
      search: sentence ? { searchQuery: sentence } : undefined,
    });
  };

  const handleImageSimilaritySearch = () => {
    closeMenu();
    tabNavigate({
      to: "/project/$projectId/imagesearch",
      params: { projectId },
      search: sentence ? { searchQuery: sentence } : undefined,
    });
  };

  const handleAddFilter = (anno: SpanAnnotationRead) => {
    closeMenu();
    tabNavigate({
      to: "/project/$projectId/search",
      params: { projectId },
      search: { searchQuery: anno.text },
    });
  };

  return (
    <Popover
      open={isPopoverOpen && hasEntries}
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
        {sentenceSearchEnabled && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleSentenceSimilaritySearch} disabled={!sentence}>
              <ListItemIcon>
                <SearchIcon />
              </ListItemIcon>
              <ListItemText primary="Find similar sentences" />
            </ListItemButton>
          </ListItem>
        )}
        {imageSearchEnabled && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleImageSimilaritySearch} disabled={!sentence}>
              <ListItemIcon>
                <SearchIcon />
              </ListItemIcon>
              <ListItemText primary="Find similar images" />
            </ListItemButton>
          </ListItem>
        )}
        {annotations &&
          codeId2CodeMap.isSuccess &&
          annotations.map((anno) => {
            const code = codeId2CodeMap.data[anno.code_id];
            return (
              <Fragment key={anno.id}>
                {/* the filter searches the annotated text with the full-text search */}
                {fullTextSearchEnabled && (
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleAddFilter(anno)}>
                      <ListItemIcon>
                        <FilterAltIcon />
                      </ListItemIcon>
                      <ListItemText primary="Filter: " />
                      <Box
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: code.color,
                          marginRight: 8,
                          marginLeft: 16,
                        }}
                      />
                      <ListItemText primary={`${code.name}: ${anno.text}`} />
                    </ListItemButton>
                  </ListItem>
                )}
                <MemoCreateOrSelectListItemButton
                  onClick={() => closeMenu()}
                  attachedObjectId={anno.id}
                  attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                  content={
                    <>
                      <ListItemText primary="Memo: " />
                      <Box
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: code.color,
                          marginRight: 8,
                          marginLeft: 8,
                        }}
                      />
                      <ListItemText primary={`${code.name}: ${anno.text}`} />
                    </>
                  }
                />
              </Fragment>
            );
          })}
      </List>
    </Popover>
  );
};
