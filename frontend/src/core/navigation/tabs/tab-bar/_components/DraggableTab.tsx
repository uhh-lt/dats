import { useDraggable, useDroppable } from "@dnd-kit/core";
import CloseIcon from "@mui/icons-material/Close";
import { memo, MouseEventHandler, useCallback } from "react";
import { TabData } from "../../../_types/TabData";
import { CloseButton, StyledTab, TabContent, TabWrapper } from "./styledComponents";
import { TabTitle } from "./TabTitle";

interface DraggableTabProps {
  tab: TabData;
  index: number;
  isActive: boolean;
  onTabClick: () => void;
  onCloseClick: () => void;
}

export const DraggableTab = memo(({ tab, index, isActive, onTabClick, onCloseClick }: DraggableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: tab.id,
  });
  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: tab.id });

  const setNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDraggableNodeRef(node);
      setDroppableNodeRef(node);
    },
    [setDraggableNodeRef, setDroppableNodeRef],
  );

  const dragStyle = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  const handleCloseClick: MouseEventHandler = useCallback(
    (e) => {
      e.stopPropagation();
      onCloseClick();
    },
    [onCloseClick],
  );

  return (
    <TabWrapper
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onTabClick}
      style={dragStyle}
      className={`${isDragging ? "dragging" : ""} ${isActive ? "active-tab" : ""}`}
    >
      <StyledTab
        label={
          <TabContent>
            <TabTitle tab={tab} />
            <CloseButton size="small" onClick={handleCloseClick}>
              <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
            </CloseButton>
          </TabContent>
        }
        value={index}
        sx={{
          pointerEvents: "none",
          width: "100%",
          boxSizing: "border-box",
          "&:hover": {},
        }}
        className={isActive ? "Mui-selected" : ""}
      />
    </TabWrapper>
  );
});
