import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import SpanAnnotationHooks from "../../../api/SpanAnnotationHooks.ts";
import ConfirmationAPI from "../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SpanAnnotationsActions } from "./spanAnnotationAnalysisSlice.ts";

function BulkDeleteSpanAnnotationsButton({ selectedAnnotations }: SATToolbarProps) {
  // actions
  const dispatch = useAppDispatch();
  const deleteBulkMutation = SpanAnnotationHooks.useDeleteBulkSpanAnnotation();
  const handleDeleteAnnotationsClick = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete ${selectedAnnotations.length} span annotation${
        selectedAnnotations.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedAnnotations.map((row) => row.id) },
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
      {selectedAnnotations.length > 0 && (
        <Tooltip
          title={`Delete ${selectedAnnotations.length} span annotation${selectedAnnotations.length > 1 ? "s" : ""}`}
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

export default BulkDeleteSpanAnnotationsButton;
