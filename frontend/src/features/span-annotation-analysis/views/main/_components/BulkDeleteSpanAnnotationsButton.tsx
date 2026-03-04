import { SpanAnnotationHooks } from "@api/hooks/SpanAnnotationHooks";
import { SpanAnnotationRow } from "@api/models/SpanAnnotationRow";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { SpanAnnotationsActions } from "../../../store/spanAnnotationAnalysisSlice";

interface BulkDeleteSpanAnnotationsButtonProps {
  selectedData: SpanAnnotationRow[];
}

export function BulkDeleteSpanAnnotationsButton({ selectedData }: BulkDeleteSpanAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const deleteBulkMutation = SpanAnnotationHooks.useDeleteBulkSpanAnnotation();
  const handleDeleteAnnotationsClick = () => {
    openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} span annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      type: "DELETE",
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedData.map((row) => row.id) },
          {
            onSuccess: () => {
              dispatch(SpanAnnotationsActions.onClearRowSelection());
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
          title={`Delete ${selectedData.length} span annotation${selectedData.length > 1 ? "s" : ""}`}
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
