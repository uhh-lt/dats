import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../../store/dialogSlice.ts";
import { SentAnnotationsActions } from "../sentAnnotationAnalysisSlice.ts";

interface BulkChangeSentAnnotationCodeButtonProps {
  selectedData: SentenceAnnotationRow[];
}

export function BulkChangeSentAnnotationCodeButton({ selectedData }: BulkChangeSentAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SentAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSentenceAnnotationEditDialog({
        sentenceAnnotationIds: selectedData.map((row) => row.id),
        onEdit: handleEditSuccess,
      }),
    );
  };

  return (
    <>
      {selectedData.length > 0 && (
        <Tooltip
          title={`Change code of ${selectedData.length} sentence annotation` + (selectedData.length > 1 ? "s" : "")}
          placement="top"
        >
          <IconButton onClick={handleChangeCodeClick}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
