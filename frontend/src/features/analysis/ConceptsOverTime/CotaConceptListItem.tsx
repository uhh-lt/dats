import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, ListItem, ListItemButton, ListItemIcon, Menu, MenuItem } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import { useCallback, useState } from "react";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface CotaConceptListItemProps {
  concept: COTAConcept;
  selectedConceptId: string | undefined;
  onSelect: (concept: COTAConcept) => void;
  onEditClick: (concept: COTAConcept) => void;
  onDeleteClick: (concept: COTAConcept) => void;
  onToggleVisibilityClick: (concept: COTAConcept) => void;
  onDuplicateClick: (concept: COTAConcept) => void;
  isDeleteEnabled: boolean;
}

export function CotaConceptListItem({
  concept,
  selectedConceptId,
  onSelect,
  onEditClick,
  onDeleteClick,
  onToggleVisibilityClick,
  onDuplicateClick,
  isDeleteEnabled,
}: CotaConceptListItemProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  }, []);

  const handleClose = useCallback((event: React.MouseEvent<HTMLLIElement>) => {
    event.stopPropagation();
    setAnchorEl(null);
  }, []);

  const handleCloseWrapper = useCallback(
    (callback: (concept: COTAConcept) => void, concept: COTAConcept) => (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      setAnchorEl(null);
      callback(concept);
    },
    [],
  );

  return (
    <ListItem
      secondaryAction={
        <>
          <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            <MenuItem onClick={handleCloseWrapper(onToggleVisibilityClick, concept)}>
              <ListItemIcon>{concept.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}</ListItemIcon>
              <ListItemText>{concept.visible ? "Hide concept" : "Show concept"}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCloseWrapper(onEditClick, concept)}>
              <ListItemIcon>{getIconComponent(Icon.EDIT)}</ListItemIcon>
              <ListItemText>Edit concept</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCloseWrapper(onDeleteClick, concept)} disabled={!isDeleteEnabled}>
              <ListItemIcon>{getIconComponent(Icon.DELETE)}</ListItemIcon>
              <ListItemText>{isDeleteEnabled ? "Delete concept" : "Reset analysis to delete concept"}</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleCloseWrapper(onDuplicateClick, concept)}>
              <ListItemIcon>{getIconComponent(Icon.DUPLICATE)}</ListItemIcon>
              <ListItemText>Duplicate concept</ListItemText>
            </MenuItem>
          </Menu>
        </>
      }
      disablePadding
    >
      <ListItemButton selected={selectedConceptId === concept.id} onClick={() => onSelect(concept)}>
        <Box minWidth="56px">
          <Box sx={{ width: 16, height: 16, backgroundColor: concept.color, ml: "4px", mr: 1, borderRadius: "100%" }} />
        </Box>
        <ListItemText primary={concept.name} />
      </ListItemButton>
    </ListItem>
  );
}
