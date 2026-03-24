import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const handleCloseClick: MouseEventHandler = useCallback(
    (event) => {
      event.stopPropagation();
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
            <CloseButton size="small" onPointerDown={(event) => event.stopPropagation()} onClick={handleCloseClick}>
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
