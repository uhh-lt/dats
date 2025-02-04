import { Button, Stack } from "@mui/material";
import { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";
import { CRUDDialogActions } from "../../../components/dialogSlice.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

function BulkChangeSpanAnnotationCodeButton({ selectedAnnotations }: SATToolbarProps & { filterName: string }) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleChangeCodeClick = () => {
    dispatch(
      CRUDDialogActions.openSpanAnnotationEditDialog({ spanAnnotationIds: selectedAnnotations.map((row) => row.id) }),
    );
  };

  return (
    <Stack direction={"row"} spacing={1} alignItems="center" p={0.5} height={48}>
      {selectedAnnotations.length > 0 && (
        <Button size="small" onClick={handleChangeCodeClick}>
          Change code of {selectedAnnotations.length} span annotations
        </Button>
      )}
    </Stack>
  );
}

export default BulkChangeSpanAnnotationCodeButton;
