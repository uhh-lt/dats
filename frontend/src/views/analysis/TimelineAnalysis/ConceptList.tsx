import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import ConceptEditor from "./ConceptEditor";
import ConceptListItem from "./ConceptListItem";
import { TimelineAnalysisActions, TimelineAnalysisConcept } from "./timelineAnalysisSlice";
import { useInitTimelineAnalysisFilterSlice } from "./useInitTimelineAnalysisFilterSlice";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice";

function ConceptList() {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux)
  const concepts = useAppSelector((state) => state.timelineAnalysis.concepts);
  const dispatch = useAppDispatch();

  // init filter slice
  useInitTimelineAnalysisFilterSlice({ projectId });

  // actions
  // we need to keep both slices in sync: timelineAnalysisFilterSlice and timelineAnalysisSlice
  const handleAddConcept = () => {
    const rootFilterId = uuidv4();
    dispatch(TimelineAnalysisFilterActions.addRootFilter({ rootFilterId }));
    dispatch(TimelineAnalysisActions.onCreateNewConcept({ conceptData: rootFilterId }));
  };

  const handleEditConcept = (concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisFilterActions.onStartFilterEdit({ rootFilterId: concept.data }));
    dispatch(TimelineAnalysisActions.onStartConceptEdit({ concept }));
  };

  const handleApplyConceptChanges = (concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisFilterActions.onFinishFilterEdit());
    dispatch(TimelineAnalysisActions.onFinishConceptEdit({ concept }));
  };

  const handleCancelConceptChanges = (concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisActions.onCancelConceptEdit());
  };

  const handleDeleteConcept = (concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisActions.deleteConcept({ concept }));
    dispatch(TimelineAnalysisFilterActions.deleteRootFilter({ rootFilterId: concept.data }));
  };

  const handleToggleVisibilityConcept = (concept: TimelineAnalysisConcept) => {
    dispatch(TimelineAnalysisActions.toggleConceptVisibility(concept));
  };

  return (
    <>
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
              <ListItemButton onClick={handleAddConcept}>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add new concept" />
              </ListItemButton>
            </ListItem>
            {concepts.map((concept, index) => (
              <ConceptListItem
                key={concept.name}
                concept={concept}
                onEditClick={handleEditConcept}
                onDeleteClick={handleDeleteConcept}
                onToggleVisibilityClick={handleToggleVisibilityConcept}
              />
            ))}
          </List>
        </CardContent>
      </Card>
      <ConceptEditor onUpdate={handleApplyConceptChanges} onCancel={handleCancelConceptChanges} />
    </>
  );
}

export default ConceptList;
