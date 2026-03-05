import CloseIcon from "@mui/icons-material/Close";
import { memo } from "react";
import { DraggableProvided, DraggableRubric, DraggableStateSnapshot } from "react-beautiful-dnd";
import { TabData } from "../../../_types/TabData";
import { StyledTab, TabContent } from "./styledComponents";
import { TabTitle } from "./TabTitle";

interface DragCloneRendererProps {
  provided: DraggableProvided;
  snapshot: DraggableStateSnapshot;
  rubric: DraggableRubric;
  tabs: TabData[];
  activeTabIndex: number | null;
}

export const DragCloneRenderer = memo(({ provided, rubric, tabs, activeTabIndex }: DragCloneRendererProps) => {
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
            <TabTitle tab={tab} />
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
});
