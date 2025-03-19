import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function MethodSelectionStep() {
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  }, [dispatch]);

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>How can I help you?</Typography>
        </LLMUtterance>
        <Stack direction="row" columnGap={2} mt={2}>
          <MethodButton
            method={TaskType.DOCUMENT_TAGGING}
            headline="Document Tagging"
            description="I will classify your documents!"
          />
          <MethodButton
            method={TaskType.METADATA_EXTRACTION}
            headline="Metadata Extraction"
            description="I will extract metadata from your documents!"
          />
          <MethodButton
            method={TaskType.ANNOTATION}
            headline="Annotation"
            description="I will annotate your documents!"
          />
          <MethodButton
            method={TaskType.SENTENCE_ANNOTATION}
            headline="Sentence Annotation"
            description="I will annotate your documents!"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </>
  );
}

interface MethodButtonProps {
  method: TaskType;
  headline: string;
  description: string;
}

function MethodButton({ method, headline, description }: MethodButtonProps) {
  const dispatch = useAppDispatch();
  const handleClick = useCallback(() => {
    dispatch(CRUDDialogActions.llmDialogGoToDataSelection({ method }));
  }, [dispatch, method]);

  return (
    <Card elevation={5} style={{ width: "100%" }} sx={{ backgroundColor: "primary.main" }}>
      <CardActionArea onClick={handleClick}>
        <CardContent style={{ textAlign: "center" }} sx={{ color: "info.contrastText", p: 3 }}>
          <h3 style={{ marginTop: 0 }}>{headline}</h3>
          {description}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default MethodSelectionStep;
