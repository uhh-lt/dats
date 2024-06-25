import { Box, Button, Grid, Portal, Stack, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import EntityHooks from "../../../api/EntityHooks.ts";
import { EntityRead } from "../../../api/openapi/models/EntityRead.ts";
import { SpanTextRead } from "../../../api/openapi/models/SpanTextRead.ts";
import EntityTable from "../../../components/entity/EntityTable.tsx";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";


function EntityDashboard() {
  const appBarContainerRef = useContext(AppBarContext);

  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux)
  const isSplitView = useAppSelector((state) => state.annotatedSegments.isSplitView);
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const entityMerge = EntityHooks.useMerge();
  const entityResolve = EntityHooks.useResolve();
  const entityUpdate = EntityHooks.useUpdateEntity();




  function handleMerg(selectedEntities: EntityRead[], selectedSpanTexts: SpanTextRead[]): void {
    const name = "merge" + selectedEntities[0]?.name + selectedSpanTexts[0]?.text;
    const requestBody = {
      requestBody: {
        name: name,
        project_id: projectId,
        entity_ids: selectedEntities.map(entity => entity.id),
        spantext_ids: selectedSpanTexts.map(spantext => spantext.id)
      }
    };
    entityMerge.mutate(requestBody);
    setRowSelectionModel({});
  }

  function handleRelease(selectedEntities: EntityRead[], selectedSpanTexts: SpanTextRead[]): void {
    console.log(rowSelectionModel);
    console.log(selectedEntities);
    console.log(selectedSpanTexts);
    const requestBody = {
      requestBody: {
        project_id: projectId,
        entity_ids: selectedEntities.map(entity => entity.id),
        spantext_ids: selectedSpanTexts.map(spantext => spantext.id)
      }
    };
    entityResolve.mutate(requestBody);
    setRowSelectionModel({});
  }



  function handleUpdate(props: any): void | Promise<void> {
    // TODO fix naming
    const requestBody =
    {
      entityId: props.values["original.id"],
      requestBody: {
        name: props.values["original.name"],
        span_text_ids: props.row.original.original.span_texts.map(span_text => span_text.id)
      }
    };
    console.log(requestBody);
    entityUpdate.mutate(requestBody);
    props.table.setEditingRow(null);
  }

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Entity Dashboard
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={isSplitView ? 6 : 12} className="myFlexContainer h100">

          <EntityTable
            projectId={projectId}
            rowSelectionModel={rowSelectionModel}
            onRowSelectionChange={setRowSelectionModel}
            renderBottomToolbarCustomActions={(props) => (
              <Stack direction={"row"} spacing={1} alignItems="center" p={1}>
                <Box flexGrow={1} />
                <Button onClick={() => handleMerg(props.selectedEntities, props.selectedSpanTexts)}>Merge</Button>
                <Button onClick={() => handleRelease(props.selectedEntities, props.selectedSpanTexts)}>Release</Button>
              </Stack>
            )} onSaveEditRow={handleUpdate}          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default EntityDashboard;
