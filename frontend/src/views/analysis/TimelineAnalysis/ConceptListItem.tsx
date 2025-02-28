import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, ListItem, Tooltip } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import { TimelineAnalysisConcept } from "../../../api/openapi/models/TimelineAnalysisConcept.ts";

interface ConceptListItemProps {
  concept: TimelineAnalysisConcept;
  onEditClick: (conceptId: string) => void;
  onDeleteClick: (conceptId: string) => void;
  onToggleVisibilityClick: (conceptId: string) => void;
}

function ConceptListItem({ concept, onEditClick, onDeleteClick, onToggleVisibilityClick }: ConceptListItemProps) {
  return (
    <>
      <ListItem
        secondaryAction={
          <>
            <Tooltip
              title={concept.visible ? "Hide concept in timeline analysis" : "Show concept in timeline analysis"}
              enterDelay={500}
            >
              <IconButton aria-label="visible" onClick={() => onToggleVisibilityClick(concept.id)}>
                {concept.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={"Edit concept"} enterDelay={500}>
              <IconButton aria-label="edit" onClick={() => onEditClick(concept.id)}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={"Delete concept"} enterDelay={500}>
              <IconButton edge="end" aria-label="delete" onClick={() => onDeleteClick(concept.id)}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
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

export default ConceptListItem;
