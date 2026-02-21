import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { ListItem, ListItemButton, ListItemIcon } from "@mui/material";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { v4 as uuidv4 } from "uuid";
import { TimelineAnalysisHooks } from "../../../api/TimelineAnalysisHooks.ts";

import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { LogicalOperator } from "../../../api/openapi/models/LogicalOperator.ts";
import { TimelineAnalysisConcept } from "../../../api/openapi/models/TimelineAnalysisConcept.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { useAppDispatch, useAppStore } from "../../../plugins/ReduxHooks.ts";
import { ConceptEditor } from "./ConceptEditor.tsx";
import { ConceptListItem } from "./ConceptListItem.tsx";
import { TimelineAnalysisActions } from "./timelineAnalysisSlice.ts";
import { useInitTimelineAnalysisFilterSlice } from "./useInitTimelineAnalysisFilterSlice.ts";

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
      timelineAnalysis.concepts[index] = {
        ...concept,
        ta_specific_filter: {
          ...concept.ta_specific_filter,
          filter: updatedFilter,
        },
      };
      console.log(timelineAnalysis.concepts[index]);
      updateTimelineAnalysisMutation.mutate({
        timelineAnalysisId: timelineAnalysis.id,
        requestBody: {
          concepts: [...timelineAnalysis.concepts],
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
      timelineAnalysis.concepts.push(duplicatedConcept);
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
