import { BboxAnnotationHooks } from "@api/hooks/BboxAnnotationHooks";
import { BBoxAnnotationRow } from "@api/models/BBoxAnnotationRow";
import { useOpenConfirmationDialog } from "@core/notification";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { BBoxAnnotationsActions } from "../../../../store/bboxAnnotationAnalysisSlice";

interface BulkDeleteBBoxAnnotationsButtonProps {
  selectedData: BBoxAnnotationRow[];
}

export function BulkDeleteBBoxAnnotationsButton({ selectedData }: BulkDeleteBBoxAnnotationsButtonProps) {
  // actions
  const dispatch = useAppDispatch();
  const openConfirmationDialog = useOpenConfirmationDialog();
  const deleteBulkMutation = BboxAnnotationHooks.useDeleteBulkBBoxAnnotation();
  const handleDeleteAnnotationsClick = () => {
    openConfirmationDialog({
      text: `Do you really want to delete ${selectedData.length} bbox annotation${
        selectedData.length > 1 ? "s" : ""
      }? This action cannot be undone!`,
      type: "DELETE",
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
