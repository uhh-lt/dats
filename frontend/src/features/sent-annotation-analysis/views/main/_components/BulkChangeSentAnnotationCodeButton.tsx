import { SentenceAnnotationRow } from "@api/models/SentenceAnnotationRow";
import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Tooltip } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";

interface BulkChangeSentAnnotationCodeButtonProps {
  selectedData: SentenceAnnotationRow[];
}

export function BulkChangeSentAnnotationCodeButton({ selectedData }: BulkChangeSentAnnotationCodeButtonProps) {
  // global client state (redux)
  const dispatch = useAppDispatch();
  const openSentenceAnnotationEdit = useOpenDialog("sentenceAnnotationEdit");

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SentAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    openSentenceAnnotationEdit({
      annotationIds: selectedData.map((row) => row.id),
      onEdit: handleEditSuccess,
    });
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
