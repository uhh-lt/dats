import { getIconComponent } from "@components/icons";
import { Box } from "@mui/material";
import { memo } from "react";
import { TabData } from "../../../_types/TabData";
import { LabelText, TabLabel } from "./styledComponents";

interface TabTitleProps {
  tab: TabData;
}

export const TabTitle = memo(({ tab }: TabTitleProps) => {
  return (
    <Box>
      <TabLabel>
        {tab.icon && getIconComponent(tab.icon)}
        <LabelText>{tab.label}</LabelText>
      </TabLabel>
    </Box>
  );
});
