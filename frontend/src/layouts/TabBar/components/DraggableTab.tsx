import CloseIcon from "@mui/icons-material/Close";
import { memo, MouseEventHandler, useCallback } from "react";
import { Draggable } from "react-beautiful-dnd";
import { CloseButton, StyledTab, TabContent, TabWrapper } from "../styles/styledComponents.tsx";
import { TabData } from "../types/TabData.ts";
import { TabTitle } from "./TabTitle.tsx";

interface DraggableTabProps {
  tab: TabData;
  index: number;
  isActive: boolean;
  onTabClick: () => void;
  onCloseClick: () => void;
}

export const DraggableTab = memo(({ tab, index, isActive, onTabClick, onCloseClick }: DraggableTabProps) => {
  const handleCloseClick: MouseEventHandler = useCallback(
    (e) => {
      e.stopPropagation();
      onCloseClick();
    },
    [onCloseClick],
  );

  return (
    <Draggable key={tab.id} draggableId={tab.id} index={index} disableInteractiveElementBlocking>
      {(provided, snapshot) => {
        return (
          <TabWrapper
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={onTabClick}
            className={`${snapshot.isDragging ? "dragging" : ""} ${isActive ? "active-tab" : ""}`}
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
      }}
    </Draggable>
  );
});
