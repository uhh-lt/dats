import EditIcon from "@mui/icons-material/Edit";
import { IconButton, Stack, Tooltip } from "@mui/material";
import { useCallback } from "react";
import { SEATToolbarProps } from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SEATToolbar.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { SentAnnotationsActions } from "./sentAnnotationAnalysisSlice.ts";

function BulkChangeSentAnnotationCodeButton({ selectedAnnotations }: SEATToolbarProps & { filterName: string }) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleEditSuccess = useCallback(() => {
    dispatch(SentAnnotationsActions.onClearRowSelection());
  }, [dispatch]);

  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSentenceAnnotationEditDialog({
        sentenceAnnotationIds: selectedAnnotations.map((row) => row.id),
        onEdit: handleEditSuccess,
      }),
    );
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center" p={0.5} height={48}>
      {selectedAnnotations.length > 0 && (
        <Tooltip title={`Change code of ${selectedAnnotations.length} sentence annotations`} placement="top">
          <IconButton onClick={handleChangeCodeClick}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}

export default BulkChangeSentAnnotationCodeButton;
