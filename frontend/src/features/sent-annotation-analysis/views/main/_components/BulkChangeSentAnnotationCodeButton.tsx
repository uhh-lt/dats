import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { useCallback } from "react";
import { SentenceAnnotationRow } from "../../../../../api/openapi/models/SentenceAnnotationRow";
import { UIDialogActions } from "../../../../../store/global/dialogSlice";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";

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
      UIDialogActions.openSentenceAnnotationEditDialog({
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
