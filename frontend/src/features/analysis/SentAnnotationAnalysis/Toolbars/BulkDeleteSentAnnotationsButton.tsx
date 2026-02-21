import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { SentenceAnnotationHooks } from "../../../../api/SentenceAnnotationHooks.ts";
import { ConfirmationAPI } from "../../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { SentAnnotationsActions } from "../sentAnnotationAnalysisSlice.ts";

interface BulkDeleteSentAnnotationsButtonProps {
  selectedData: SentenceAnnotationRow[];
}

export function BulkDeleteSentAnnotationsButton({ selectedData }: BulkDeleteSentAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const deleteBulkMutation = SentenceAnnotationHooks.useDeleteBulkSentenceAnnotation();
  const handleDeleteAnnotationsClick = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} sentence annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
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
