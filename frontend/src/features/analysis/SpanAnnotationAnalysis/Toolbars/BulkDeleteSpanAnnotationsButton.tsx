import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow.ts";
import { SpanAnnotationHooks } from "../../../../api/SpanAnnotationHooks.ts";
import { ConfirmationAPI } from "../../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { SpanAnnotationsActions } from "../spanAnnotationAnalysisSlice.ts";

interface BulkDeleteSpanAnnotationsButtonProps {
  selectedData: SpanAnnotationRow[];
}

export function BulkDeleteSpanAnnotationsButton({ selectedData }: BulkDeleteSpanAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const deleteBulkMutation = SpanAnnotationHooks.useDeleteBulkSpanAnnotation();
  const handleDeleteAnnotationsClick = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} span annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
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
