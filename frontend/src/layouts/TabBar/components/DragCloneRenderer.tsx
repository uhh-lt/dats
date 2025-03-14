import CloseIcon from "@mui/icons-material/Close";
import React from "react";
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot } from "react-beautiful-dnd";
import { getIconComponent } from "../../../utils/icons/iconUtils.tsx";
import { LabelText, StyledTab, TabContent, TabLabel } from "../styles";
import { TabData } from "../types";

interface DragCloneRendererProps {
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  rubric: DraggableRubric;
  tabs: TabData[];
  activeTabIndex: number | null;
}

export const DragCloneRenderer: React.FC<DragCloneRendererProps> = ({ provided, rubric, tabs, activeTabIndex }) => {
  const tab = tabs[rubric.source.index];
  const isActiveTab = activeTabIndex === rubric.source.index;

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      style={{
        ...provided.draggableProps.style,
        display: "flex",
        width: "auto",
        minWidth: "100px",
        boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
      }}
    >
      <StyledTab
        label={
          <TabContent>
            <TabLabel>
              {tab.icon && getIconComponent(tab.icon)}
              <LabelText>{tab.label}</LabelText>
            </TabLabel>
            <CloseIcon fontSize="small" sx={{ fontSize: 16, ml: 1, opacity: 0.5 }} />
          </TabContent>
        }
        sx={{
          width: "100%",
          boxSizing: "border-box",
          padding: "8px 8px 10px 8px",
        }}
        className={isActiveTab ? "Mui-selected" : ""}
      />
    </div>
  );
};
