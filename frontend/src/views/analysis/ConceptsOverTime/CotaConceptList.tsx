import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/Info";
import { ListItemButton, ListItemIcon, Tooltip } from "@mui/material";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemText from "@mui/material/ListItemText";
import { v4 as uuidv4 } from "uuid";
import CotaHooks from "../../../api/CotaHooks.ts";
import { COTAConcept } from "../../../api/openapi/models/COTAConcept.ts";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import CotaConceptEditor from "./CotaConceptEditor.tsx";
import CotaConceptListItem from "./CotaConceptListItem.tsx";
import { CotaActions } from "./cotaSlice.ts";
import { canAddNewConcept, canDeleteConcept, canEditConceptDescription } from "./cotaUtils.ts";

interface CotaConceptListProps {
  cota: COTARead;
}

function CotaConceptList({ cota }: CotaConceptListProps) {
  // global client state (redux)
  const selectedConceptId = useAppSelector((state) => state.cota.selectedConceptId);
  const dispatch = useAppDispatch();

  // mutations
  const updateCota = CotaHooks.useUpdateCota();

  // actions
  const handleAddConcept = () => {
    const conceptId = uuidv4();
    updateCota.mutate({
      cotaId: cota.id,
      requestBody: {
        concepts: [
          ...cota.concepts,
          {
            id: conceptId,
            name: `Concept ${cota.concepts.length + 1}`,
            description: "",
            color: "#000000",
            visible: true,
          },
        ],
      },
    });
  };

  const handleDeleteConcept = (concept: COTAConcept) => {
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts.splice(index, 1);
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleToggleVisibilityConcept = (concept: COTAConcept) => {
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts[index].visible = !cotaConcepts[index].visible;
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleApplyConceptChanges = (concept: COTAConcept) => {
    dispatch(CotaActions.onFinishConceptEdit());
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      cotaConcepts[index] = concept;
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          concepts: cotaConcepts,
        },
      });
    }
  };

  const handleStartEditConcept = (concept: COTAConcept) => {
    dispatch(CotaActions.onStartConceptEdit({ concept }));
  };

  const handleCancelConceptChanges = () => {
    dispatch(CotaActions.onCancelConceptEdit());
  };

  const handleSelectConcept = (concept: COTAConcept) => {
    dispatch(CotaActions.onSelectConcept({ conceptId: concept.id }));
  };

  const handleDuplicateConcept = (concept: COTAConcept) => {
    const cotaConcepts = JSON.parse(JSON.stringify(cota.concepts)) as COTAConcept[];
    const index = cotaConcepts.findIndex((c) => c.id === concept.id);
    if (index !== -1) {
      const duplicatedConcept = {
        ...cotaConcepts[index],
        id: uuidv4(),
        name: `${cotaConcepts[index].name} (copy)`,
      };
      cotaConcepts.push(duplicatedConcept);
      updateCota.mutate({
        cotaId: cota.id,
        requestBody: {
          concepts: cotaConcepts,
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
            <Tooltip title={canAddNewConcept(cota) ? undefined : "Reset the analysis to add new concepts"} followCursor>
              <span>
                <ListItemButton onClick={handleAddConcept} disabled={!canAddNewConcept(cota)}>
                  <ListItemIcon>
                    <AddIcon />
                  </ListItemIcon>
                  <ListItemText primary="Add new concept" />
                </ListItemButton>
              </span>
            </Tooltip>
            {cota.concepts.map((concept) => (
              <CotaConceptListItem
                key={concept.id}
                concept={concept}
                selectedConceptId={selectedConceptId}
                onSelect={handleSelectConcept}
                onEditClick={handleStartEditConcept}
                onDeleteClick={handleDeleteConcept}
                onToggleVisibilityClick={handleToggleVisibilityConcept}
                onDuplicateClick={handleDuplicateConcept}
                isDeleteEnabled={canDeleteConcept(cota)}
              />
            ))}
          </List>
        </CardContent>
      </Card>
      <CotaConceptEditor
        onUpdate={handleApplyConceptChanges}
        onCancel={handleCancelConceptChanges}
        isDescriptionEditable={canEditConceptDescription(cota)}
      />
    </>
  );
}

export default CotaConceptList;
