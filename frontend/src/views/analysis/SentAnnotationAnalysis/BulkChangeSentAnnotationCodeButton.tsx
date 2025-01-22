import { Button, Stack } from "@mui/material";
import { SEATToolbarProps } from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SEATToolbar.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

function BulkChangeSentAnnotationCodeButton({ selectedAnnotations }: SEATToolbarProps & { filterName: string }) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSentenceAnnotationEditDialog({
        sentenceAnnotationIds: selectedAnnotations.map((row) => row.id),
      }),
    );
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center" p={0.5} height={48}>
      {selectedAnnotations.length > 0 && (
        <Button size="small" onClick={handleChangeCodeClick}>
          Change code of {selectedAnnotations.length} sent annotations
        </Button>
      )}
    </Stack>
  );
}

export default BulkChangeSentAnnotationCodeButton;
