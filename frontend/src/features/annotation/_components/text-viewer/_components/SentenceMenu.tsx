import { CodeHooks } from "@api/hooks/CodeHooks";
import { MemoListItemButton } from "@core/memo";
import { useTabNavigate } from "@core/navigation";
import { AttachedObjectType } from "@models/AttachedObjectType";
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
          codeId2CodeMap.isSuccess &&
          annotations.map((anno) => {
            const code = codeId2CodeMap.data[anno.code_id];
            return (
              <Fragment key={anno.id}>
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
                <MemoListItemButton
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
