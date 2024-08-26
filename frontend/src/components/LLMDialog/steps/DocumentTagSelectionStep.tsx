import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import TagTable from "../../Tag/TagTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function DocumentTagSelectionStep({ projectId }: { projectId: number }) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  const handleNext = (tags: DocumentTagRead[]) => () => {
    dispatch(CRUDDialogActions.llmDialogSelectTags({ tags }));
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic document tagging. Please select all tags
            that I should use to classify the documents.
          </Typography>
        </LLMUtterance>
      </DialogContent>
      <TagTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbarCustomActions={(props) => (
          <DialogActions sx={{ width: "100%", p: 0 }}>
            <Box flexGrow={1} />
            <Button onClick={() => dispatch(CRUDDialogActions.backToMethodSelectionLLMDialogStep())}>Back</Button>
            <Button disabled={props.selectedTags.length === 0} onClick={handleNext(props.selectedTags)}>
              Next
            </Button>
          </DialogActions>
        )}
      />
    </>
  );
}

export default DocumentTagSelectionStep;
