import CloseIcon from "@mui/icons-material/Close";
import { memo } from "react";
import { TabData } from "../../../_types/TabData";
import { StyledTab, TabContent } from "./styledComponents";
import { TabTitle } from "./TabTitle";

interface DragCloneRendererProps {
  tab: TabData;
  isActive: boolean;
}

export const DragCloneRenderer = memo(({ tab, isActive }: DragCloneRendererProps) => {
  return (
    <div
      style={{
        display: "flex",
        width: "auto",
        minWidth: "100px",
        boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
        pointerEvents: "none",
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
        className={isActive ? "Mui-selected" : ""}
      />
    </div>
  );
});
