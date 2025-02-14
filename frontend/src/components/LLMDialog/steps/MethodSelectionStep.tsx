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
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function MethodSelectionStep() {
  const dispatch = useAppDispatch();
  const selectMethod = (method: TaskType) => () => {
    dispatch(CRUDDialogActions.llmDialogGoToDataSelection({ method }));
  };
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>How can I help you?</Typography>
        </LLMUtterance>
        <Stack direction="row" columnGap={2} mt={2}>
          <MethodButton
            onClick={selectMethod(TaskType.DOCUMENT_TAGGING)}
            headline="Document Tagging"
            description="I will classify your documents!"
          />
          <MethodButton
            onClick={selectMethod(TaskType.METADATA_EXTRACTION)}
            headline="Metadata Extraction"
            description="I will extract metadata from your documents!"
          />
          <MethodButton
            onClick={selectMethod(TaskType.ANNOTATION)}
            headline="Annotation"
            description="I will annotate your documents!"
          />
          <MethodButton
            onClick={selectMethod(TaskType.SENTENCE_ANNOTATION)}
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
  onClick: () => void;
  headline: string;
  description: string;
}

function MethodButton({ onClick, headline, description }: MethodButtonProps) {
  return (
    <Card elevation={5} style={{ width: "100%" }} sx={{ backgroundColor: "primary.main" }}>
      <CardActionArea onClick={onClick}>
        <CardContent style={{ textAlign: "center" }} sx={{ color: "info.contrastText", p: 3 }}>
          <h3 style={{ marginTop: 0 }}>{headline}</h3>
          {description}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default MethodSelectionStep;
