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
import TimelineAnalysisHooks from "../../../api/TimelineAnalysisHooks.ts";

import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { TimelineAnalysisColumns } from "../../../api/openapi/models/TimelineAnalysisColumns.ts";
import { TimelineAnalysisConcept_Output } from "../../../api/openapi/models/TimelineAnalysisConcept_Output.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { MyFilter } from "../../../features/FilterDialog/filterUtils.ts";
import { useAppDispatch, useAppStore } from "../../../plugins/ReduxHooks.ts";
import ConceptEditor from "./ConceptEditor.tsx";
import ConceptListItem from "./ConceptListItem.tsx";
import { TimelineAnalysisFilterActions } from "./timelineAnalysisFilterSlice.ts";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";
import { useInitTimelineAnalysisFilterSlice } from "./useInitTimelineAnalysisFilterSlice.ts";

interface ConceptListProps {
  timelineAnalysis: TimelineAnalysisRead;
}

function ConceptList({ timelineAnalysis }: ConceptListProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux)
  const dispatch = useAppDispatch();

  // init filter slice
  useInitTimelineAnalysisFilterSlice({ projectId });

  // actions
  const updateTimelineAnalysisMutation = TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const handleAddConcept = () => {
    timelineAnalysis.concepts.push({
      id: uuidv4(),
      name: `New Concept #${timelineAnalysis.concepts.length + 1}`,
      visible: true,
      color: "#000000",
      description: "",
      filter: {
        items: [],
        logic_operator: LogicalOperator.AND,
      },
    });
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        concepts: [...timelineAnalysis.concepts],
      },
    });
  };

  const handleEditConcept = (conceptId: string) => {
    const concept = timelineAnalysis.concepts.find((c) => c.id === conceptId);
    if (concept) {
      dispatch(TimelineAnalysisActions.onStartConceptEdit({ concept }));
      dispatch(
        TimelineAnalysisFilterActions.onStartFilterEdit({
          rootFilterId: conceptId,
          filter: { ...concept.filter, id: conceptId } as MyFilter<TimelineAnalysisColumns>,
        }),
      );
    }
  };

  const store = useAppStore();
  const handleApplyConceptChanges = (concept: TimelineAnalysisConcept_Output) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === concept.id);
    if (index === -1) {
      console.error(`Concept ${concept.id} not found`);
    } else {
      const updatedFilter = store.getState().timelineAnalysisFilter.editableFilter as MyFilter<TimelineAnalysisColumns>;
      timelineAnalysis.concepts[index] = {
        ...concept,
        filter: updatedFilter,
      };
      console.log(timelineAnalysis.concepts[index]);
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: [...timelineAnalysis.concepts],
        },
      });
    }
    dispatch(TimelineAnalysisFilterActions.onFinishFilterEdit());
    dispatch(TimelineAnalysisActions.onFinishConceptEdit());
  };

  const handleCancelConceptChanges = () => {
    dispatch(TimelineAnalysisActions.onCancelConceptEdit());
  };

  const handleDeleteConcept = (conceptId: string) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === conceptId);
    if (index !== -1) {
      timelineAnalysis.concepts.splice(index, 1);
    }
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        concepts: [...timelineAnalysis.concepts],
      },
    });
  };

  const handleToggleVisibilityConcept = (conceptId: string) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === conceptId);
    if (index === -1) {
      console.error(`Concept ${conceptId} not found`);
    } else {
      timelineAnalysis.concepts[index] = {
        ...timelineAnalysis.concepts[index],
        visible: !timelineAnalysis.concepts[index].visible,
      };
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: [...timelineAnalysis.concepts],
        },
      });
    }
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
            {timelineAnalysis.concepts.map((concept) => (
              <ConceptListItem
                key={concept.id}
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
