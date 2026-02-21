import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { BboxAnnotationHooks } from "../../../../api/BboxAnnotationHooks.ts";
import { BBoxAnnotationRow } from "../../../../api/openapi/models/BBoxAnnotationRow.ts";
import { ConfirmationAPI } from "../../../../components/ConfirmationDialog/ConfirmationAPI.ts";
import { useAppDispatch } from "../../../../plugins/ReduxHooks.ts";
import { BBoxAnnotationsActions } from "../bboxAnnotationAnalysisSlice.ts";

interface BulkDeleteBBoxAnnotationsButtonProps {
  selectedData: BBoxAnnotationRow[];
}

export function BulkDeleteBBoxAnnotationsButton({ selectedData }: BulkDeleteBBoxAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const deleteBulkMutation = BboxAnnotationHooks.useDeleteBulkBBoxAnnotation();
  const handleDeleteAnnotationsClick = () => {
    ConfirmationAPI.openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} bbox annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      onAccept: () => {
        deleteBulkMutation.mutate(
          { requestBody: selectedData.map((row) => row.id) },
          {
            onSuccess: () => {
              dispatch(BBoxAnnotationsActions.onClearRowSelection());
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
          title={`Delete ${selectedData.length} bbox annotation${selectedData.length > 1 ? "s" : ""}`}
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
