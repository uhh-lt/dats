import { useOpenConfirmationDialog } from "@core/notification";
import { SentenceAnnotationHooks } from "@core/sentence-annotation";
import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { SentAnnotationAnalysisActions } from "../../../store/sentAnnotationAnalysisSlice";

interface BulkDeleteSentAnnotationsButtonProps {
  selectedData: SentenceAnnotationRow[];
}

export function BulkDeleteSentAnnotationsButton({ selectedData }: BulkDeleteSentAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const deleteBulkMutation = SentenceAnnotationHooks.useDeleteBulkSentenceAnnotation();
  const handleDeleteAnnotationsClick = () => {
    openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} sentence annotation${selectedData.length > 1 ? "s" : ""}? This action cannot be undone!`,
      type: "DELETE",
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedData.map((row) => row.id) },
          {
            onSuccess: () => {
              dispatch(SentAnnotationAnalysisActions.onClearRowSelection());
            },
          },
        );
      },
    });
  };

  return (
    <>
      {selectedData.length > 0 && (
        <Tooltip
          title={`Delete ${selectedData.length} sentence annotation${selectedData.length > 1 ? "s" : ""}`}
          placement="top"
        >
          <IconButton onClick={handleDeleteAnnotationsClick}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      )}
    </>
  );
}
