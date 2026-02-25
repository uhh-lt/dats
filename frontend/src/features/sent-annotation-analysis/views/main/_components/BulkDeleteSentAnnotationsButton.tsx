import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { SentenceAnnotationRow } from "../../../../../api/openapi/models/SentenceAnnotationRow";
import { SentenceAnnotationHooks } from "../../../../../api/SentenceAnnotationHooks";
import { SentAnnotationsActions } from "../../../store/sentAnnotationAnalysisSlice";

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
      text: `Do you really want to delete ${selectedData.length} sentence annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      type: "DELETE",
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedData.map((row) => row.id) },
          {
            onSuccess: () => {
              dispatch(SentAnnotationsActions.onClearRowSelection());
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
