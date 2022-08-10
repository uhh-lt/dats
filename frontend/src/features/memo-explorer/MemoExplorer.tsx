import { Divider, List, ListItemButton, ListItemIcon, ListItemText, ListProps } from "@mui/material";
import React from "react";
import LabelIcon from "@mui/icons-material/Label";
import LightbulbIcon from "@mui/icons-material/Lightbulb";
import StarIcon from "@mui/icons-material/Star";
import { AttachedObjectType } from "../../api/openapi";
import { MemoColors, MemoNames, MemoShortnames } from "../memo-results/MemoEnumUtils";

interface MemoExplorerProps {
  handleCategoryClick: (category: string) => void;
  handleAllClick: () => void;
  selectedCategory: string | undefined;
}

function MemoExplorer({
  handleCategoryClick,
  handleAllClick,
  selectedCategory,
  ...props
}: MemoExplorerProps & ListProps) {
  return (
    <List {...(props as ListProps)}>
      <ListItemButton onClick={() => handleAllClick()}>
        <ListItemIcon>
          <LightbulbIcon />
        </ListItemIcon>
        <ListItemText primary="Alle Memos" />
      </ListItemButton>
      <ListItemButton onClick={() => handleCategoryClick("important")}>
        <ListItemIcon>
          <StarIcon />
        </ListItemIcon>
        <ListItemText primary="Wichtige Memos" />
      </ListItemButton>
      <Divider />
      {Object.values(AttachedObjectType).map((key) => (
        <ListItemButton
          key={MemoShortnames[key]}
          selected={selectedCategory === MemoNames[key].toLowerCase()}
          onClick={() => handleCategoryClick(MemoNames[key])}
        >
          <ListItemIcon style={{ color: MemoColors[key] }}>
            <LabelIcon />
          </ListItemIcon>
          <ListItemText primary={MemoNames[key]} />
        </ListItemButton>
      ))}
    </List>
  );
}

export default MemoExplorer;
