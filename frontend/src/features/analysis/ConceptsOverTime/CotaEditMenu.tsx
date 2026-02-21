import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { forwardRef } from "react";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { GenericPositionMenu, GenericPositionMenuHandle } from "../../../components/GenericPositionMenu.tsx";

interface CotaEditMenuProps {
  cota: COTARead;
  onAnnotateSentences: (conceptId: string | null) => void;
  onRemoveSentences: () => void;
}

const CotaEditMenu = forwardRef<GenericPositionMenuHandle, CotaEditMenuProps>(
  ({ cota, onAnnotateSentences, onRemoveSentences }, ref) => {
    return (
      <GenericPositionMenu ref={ref}>
        <MenuItem onClick={() => onAnnotateSentences(null)}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Clear annotation</ListItemText>
        </MenuItem>
        {cota.concepts.map((concept) => (
          <MenuItem onClick={() => onAnnotateSentences(concept.id)} key={concept.id}>
            <ListItemIcon>
              <CircleIcon fontSize="small" style={{ color: concept.color }} />
            </ListItemIcon>
            <ListItemText>{concept.name}</ListItemText>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => onRemoveSentences()}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Remove sentence</ListItemText>
        </MenuItem>
      </GenericPositionMenu>
    );
  },
);
