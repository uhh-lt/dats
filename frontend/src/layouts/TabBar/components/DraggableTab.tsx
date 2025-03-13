import CloseIcon from "@mui/icons-material/Close";
import React from "react";
import { Draggable } from "react-beautiful-dnd";
import { CloseButton, LabelText, StyledTab, TabContent, TabLabel, TabWrapper } from "../styles";
import { TabData } from "../types";

interface DraggableTabProps {
  tab: TabData;
  index: number;
  isActive: boolean;
  onTabClick: () => void;
  onCloseClick: () => void;
}

export const DraggableTab: React.FC<DraggableTabProps> = ({ tab, index, isActive, onTabClick, onCloseClick }) => {
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
                  <TabLabel>
                    {tab.icon}
                    <LabelText>{tab.label}</LabelText>
                  </TabLabel>
                  <CloseButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseClick();
                    }}
                  >
                    <CloseIcon fontSize="small" sx={{ fontSize: 16 }} />
                  </CloseButton>
                </TabContent>
              }
              value={index}
              sx={{
                pointerEvents: "none",
                width: "100%",
                boxSizing: "border-box",
                "&:hover": {}, // Remove hover styles from here as they're now on the wrapper
              }}
              onClick={undefined}
              className={isActive ? "Mui-selected" : ""}
            />
          </TabWrapper>
        );
      }}
    </Draggable>
  );
};
