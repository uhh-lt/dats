import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, ListItem, ListItemIcon, Menu, MenuItem } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import { useCallback, useState } from "react";
import { TimelineAnalysisConcept } from "../../../api/openapi/models/TimelineAnalysisConcept.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";

interface ConceptListItemProps {
  concept: TimelineAnalysisConcept;
  onEditClick: (conceptId: string) => void;
  onDeleteClick: (conceptId: string) => void;
  onToggleVisibilityClick: (conceptId: string) => void;
  onDuplicateClick: (conceptId: string) => void;
}

export function ConceptListItem({
  concept,
  onEditClick,
  onDeleteClick,
  onToggleVisibilityClick,
  onDuplicateClick,
}: ConceptListItemProps) {
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
    (callback: (conceptId: string) => void, conceptId: string) => (event: React.MouseEvent<HTMLLIElement>) => {
      event.stopPropagation();
      setAnchorEl(null);
      callback(conceptId);
    },
    [],
  );

  return (
    <>
      <ListItem
        secondaryAction={
          <>
            <IconButton onClick={handleClick}>{getIconComponent(Icon.CONTEXT_MENU)}</IconButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
              <MenuItem onClick={handleCloseWrapper(onToggleVisibilityClick, concept.id)}>
                <ListItemIcon>{concept.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}</ListItemIcon>
                <ListItemText>{concept.visible ? "Hide concept" : "Show concept"}</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleCloseWrapper(onEditClick, concept.id)}>
                <ListItemIcon>{getIconComponent(Icon.EDIT)}</ListItemIcon>
                <ListItemText>Edit concept</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleCloseWrapper(onDeleteClick, concept.id)}>
                <ListItemIcon>{getIconComponent(Icon.DELETE)}</ListItemIcon>
                <ListItemText>Delete concept</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleCloseWrapper(onDuplicateClick, concept.id)}>
                <ListItemIcon>{getIconComponent(Icon.DUPLICATE)}</ListItemIcon>
                <ListItemText>Duplicate concept</ListItemText>
              </MenuItem>
            </Menu>
          </>
        }
      >
        <Box minWidth="56px">
          <Box sx={{ width: 16, height: 16, backgroundColor: concept.color, ml: "4px", mr: 1, borderRadius: "100%" }} />
        </Box>
        <ListItemText primary={concept.name} />
      </ListItem>
    </>
  );
}
