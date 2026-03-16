import { COTARead } from "@api/models/COTARead";
import { GenericPositionMenu, GenericPositionMenuHandle } from "@components/GenericPositionMenu";
import CircleIcon from "@mui/icons-material/Circle";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from "@mui/icons-material/Delete";
import { Divider, ListItemIcon, ListItemText, MenuItem } from "@mui/material";

interface CotaEditMenuProps {
  ref: React.Ref<GenericPositionMenuHandle>;
  cota: COTARead;
  onAnnotateSentences: (conceptId: string | null) => void;
  onRemoveSentences: () => void;
}

export const CotaEditMenu = ({ ref, cota, onAnnotateSentences, onRemoveSentences }: CotaEditMenuProps) => {
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
};
