import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import InfoIcon from "@mui/icons-material/Info";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Box, ListItem, ListItemButton, ListItemIcon, Tooltip } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnalysisActions, TimelineAnalysisConcept } from "../analysisSlice";
import AddIcon from "@mui/icons-material/Add";

function TimelineAnalysisConcepts() {
  // redux
  const concepts = useAppSelector((state) => state.analysis.concepts);
  const dispatch = useAppDispatch();

  const handleAdd = () => {
    dispatch(AnalysisActions.resetCurrentConcept());
    dispatch(AnalysisActions.setConceptEditorOpen(true));
  };

  return (
    <Card className="myFlexContainer h100">
      <CardHeader
        className="myFlexFitContentContainer"
        action={
          <IconButton aria-label="info">
            <InfoIcon />
          </IconButton>
        }
        title="Concepts"
        subheader="The concepts to be analyzed in the timeline"
      />
      <CardContent className="myFlexFillAllContainer">
        <List sx={{ width: "100%", bgcolor: "background.paper" }}>
          <ListItem disablePadding>
            <ListItemButton onClick={handleAdd}>
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Add new concept" />
            </ListItemButton>
          </ListItem>
          {concepts.map((concept, index) => (
            <CustomListItem key={concept.name} concept={concept} />
          ))}
        </List>
      </CardContent>
    </Card>
  );
}

interface CustomListItemProps {
  concept: TimelineAnalysisConcept;
}

function CustomListItem({ concept }: CustomListItemProps) {
  // local state
  const [open, setOpen] = useState(false);

  // redux
  const dispatch = useAppDispatch();

  // event handlers
  const handleEdit = () => {
    dispatch(AnalysisActions.setCurrentConcept(concept));
    dispatch(AnalysisActions.setConceptEditorOpen(true));
  };

  return (
    <>
      <ListItem
        secondaryAction={
          <>
            <Tooltip
              title={concept.visible ? "Hide concept in timeline analysis" : "Show concept in timeline analysis"}
              enterDelay={500}
            >
              <IconButton
                aria-label="visible"
                onClick={() => dispatch(AnalysisActions.toggleConceptVisibility(concept))}
              >
                {concept.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={"Edit concept"} enterDelay={500}>
              <IconButton aria-label="edit" onClick={handleEdit}>
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={"Delete concept"} enterDelay={500}>
              <IconButton
                edge="end"
                aria-label="delete"
                onClick={() => dispatch(AnalysisActions.deleteConcept(concept))}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </>
        }
        sx={{ ml: 0.5 }}
      >
        <Tooltip title={open ? "Hide concept sentences" : "Show concept sentences"} enterDelay={500}>
          <IconButton edge="start" aria-label="open" onClick={() => setOpen(!open)}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Tooltip>
        <Box sx={{ width: 16, height: 16, backgroundColor: concept.color, ml: 3, mr: 1 }} />
        <ListItemText primary={concept.name} />
      </ListItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding dense>
          {concept.data.map((item, index) => (
            <ListItem key={index} sx={{ pl: 7 }}>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </>
  );
}

export default TimelineAnalysisConcepts;
