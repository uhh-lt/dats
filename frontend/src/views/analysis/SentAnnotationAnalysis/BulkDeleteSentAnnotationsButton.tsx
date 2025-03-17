import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import SentenceAnnotationHooks from "../../../api/SentenceAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { SEATToolbarProps } from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SEATToolbar.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SentAnnotationsActions } from "./sentAnnotationAnalysisSlice.ts";

function BulkDeleteSentAnnotationsButton({ selectedAnnotations }: SEATToolbarProps) {
  // actions
  const dispatch = useAppDispatch();
  const deleteBulkMutation = SentenceAnnotationHooks.useDeleteBulkSentenceAnnotation();
  const handleDeleteAnnotationsClick = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete ${selectedAnnotations.length} sentence annotation${
        selectedAnnotations.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedAnnotations.map((row) => row.id) },
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
      {selectedAnnotations.length > 0 && (
        <Tooltip
          title={`Delete ${selectedAnnotations.length} sentence annotation${selectedAnnotations.length > 1 ? "s" : ""}`}
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

export default BulkDeleteSentAnnotationsButton;
