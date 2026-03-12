import { TimelineAnalysisHooks } from "@api/hooks/TimelineAnalysisHooks";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { v4 as uuidv4 } from "uuid";

import { BBoxColumns } from "@api/models/BBoxColumns";
import { LogicalOperator } from "@api/models/LogicalOperator";
import { TimelineAnalysisConcept } from "@api/models/TimelineAnalysisConcept";
import { TimelineAnalysisRead } from "@api/models/TimelineAnalysisRead";
import { CardContainer } from "@components/CardContainer";
import { MyFilter } from "@core/filter";
import { useAppDispatch, useAppStore } from "@store/storeHooks";
import { TimelineAnalysisActions } from "../../../store/timelineAnalysisSlice";
import { ConceptEditor } from "./ConceptEditor";
import { ConceptListItem } from "./ConceptListItem";
import { useInitTimelineAnalysisFilterSlice } from "./useInitTimelineAnalysisFilterSlice";

interface ConceptListProps {
  timelineAnalysis: TimelineAnalysisRead;
}

export function ConceptList({ timelineAnalysis }: ConceptListProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // init filter slice
  useInitTimelineAnalysisFilterSlice({ timelineAnalysis });

  // actions
  const updateTimelineAnalysisMutation = TimelineAnalysisHooks.useUpdateTimelineAnalysis();
  const handleAddConcept = () => {
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        concepts: [
          ...timelineAnalysis.concepts,
          {
            id: uuidv4(),
            name: `New Concept #${timelineAnalysis.concepts.length + 1}`,
            visible: true,
            color: "#000000",
            description: "",
            ta_specific_filter: {
              timeline_analysis_type: timelineAnalysis.timeline_analysis_type,
              filter: {
                id: uuidv4(),
                items: [],
                logic_operator: LogicalOperator.AND,
              },
            },
          },
        ],
      },
    });
  };

  const handleEditConcept = (conceptId: string) => {
    const concept = timelineAnalysis.concepts.find((c) => c.id === conceptId);
    if (concept) {
      dispatch(TimelineAnalysisActions.onStartConceptEdit({ concept }));
      dispatch(
        TimelineAnalysisActions.onStartFilterEdit({
          filterId: conceptId,
          filter: { ...concept.ta_specific_filter.filter, id: conceptId },
        }),
      );
    }
  };

  const store = useAppStore();
  const handleApplyConceptChanges = (concept: TimelineAnalysisConcept) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === concept.id);
    if (index === -1) {
      console.error(`Concept ${concept.id} not found`);
    } else {
      const updatedFilter = store.getState().timelineAnalysis.editableFilter as MyFilter<BBoxColumns>;
      const updatedConcepts = [...timelineAnalysis.concepts];
      updatedConcepts[index] = {
        ...concept,
        ta_specific_filter: {
          ...concept.ta_specific_filter,
          filter: updatedFilter,
        },
      };
      console.log(updatedConcepts[index]);
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: updatedConcepts,
        },
      });
    }
    dispatch(TimelineAnalysisActions.onFinishFilterEdit());
    dispatch(TimelineAnalysisActions.onFinishConceptEdit());
  };

  const handleCancelConceptChanges = () => {
    dispatch(TimelineAnalysisActions.onCancelConceptEdit());
  };

  const handleDeleteConcept = (conceptId: string) => {
    const updatedConcepts = timelineAnalysis.concepts.filter((c) => c.id !== conceptId);
    updateTimelineAnalysisMutation.mutate({
      timelineAnalysisId: timelineAnalysis.id,
      requestBody: {
        concepts: updatedConcepts,
      },
    });
  };

  const handleToggleVisibilityConcept = (conceptId: string) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === conceptId);
    if (index === -1) {
      console.error(`Concept ${conceptId} not found`);
    } else {
      const updatedConcepts = [...timelineAnalysis.concepts];
      updatedConcepts[index] = {
        ...updatedConcepts[index],
        visible: !updatedConcepts[index].visible,
      };
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: updatedConcepts,
        },
      });
    }
  };

  const handleDuplicateConcept = (conceptId: string) => {
    const index = timelineAnalysis.concepts.findIndex((c) => c.id === conceptId);
    if (index === -1) {
      console.error(`Concept ${conceptId} not found`);
    } else {
      const duplicatedConcept = {
        ...timelineAnalysis.concepts[index],
        id: uuidv4(),
        name: `Duplicated Concept #${timelineAnalysis.concepts.length + 1}`,
      };
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: [...timelineAnalysis.concepts, duplicatedConcept],
        },
      });
    }
  };

  return (
    <>
      <CardContainer className="myFlexContainer h100">
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
                onDuplicateClick={handleDuplicateConcept}
              />
            ))}
          </List>
        </CardContent>
      </CardContainer>
      <ConceptEditor onUpdate={handleApplyConceptChanges} onCancel={handleCancelConceptChanges} />
    </>
  );
}
