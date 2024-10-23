import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton, TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, CircularProgress, DialogActions, DialogContent, Tab, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { AnnotationLLMJobResult } from "../../../../api/openapi/models/AnnotationLLMJobResult.ts";
import { CodeRead } from "../../../../api/openapi/models/CodeRead.ts";
import { SpanAnnotationCreate } from "../../../../api/openapi/models/SpanAnnotationCreate.ts";
import { SpanAnnotationReadResolved } from "../../../../api/openapi/models/SpanAnnotationReadResolved.ts";
import SpanAnnotationHooks from "../../../../api/SpanAnnotationHooks.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import SdocRenderer from "../../../SourceDocument/SdocRenderer.tsx";
import LLMUtterance from "../LLMUtterance.tsx";
import TextAnnotationValidator from "./TextAnnotationValidator.tsx";

function AnnotationResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.result) {
    return (
      <AnnotationResultStepContent jobResult={llmJob.data.result.specific_llm_job_result as AnnotationLLMJobResult} />
    );
  } else if (llmJob.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmJob.isError) {
    return <DialogContent>{llmJob.error.message}</DialogContent>;
  } else {
    return null;
  }
}

function AnnotationResultStepContent({ jobResult }: { jobResult: AnnotationLLMJobResult }) {
  // we extract the codes from the job
  const codesForSelection = useMemo(() => {
    const annotationResults = jobResult.results;
    const annotations = annotationResults.reduce<SpanAnnotationReadResolved[]>((acc, r) => {
      acc.push(...r.suggested_annotations);
      return acc;
    }, []);

    return Object.values(
      annotations.reduce<Record<number, CodeRead>>((acc, a) => {
        acc[a.code.id] = a.code;
        return acc;
      }, {}),
    );
  }, [jobResult]);

  // local state to manage tabs
  const [tab, setTab] = useState<string>(jobResult.results[0].sdoc_id.toString());
  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };

  // local state to manage annotations
  const [annotations, setAnnotations] = useState<Record<number, SpanAnnotationReadResolved[]>>(() =>
    jobResult.results.reduce<Record<number, SpanAnnotationReadResolved[]>>((acc, r) => {
      acc[r.sdoc_id] = r.suggested_annotations;
      return acc;
    }, {}),
  );
  const handleChangeAnnotations = (sdocId: number) => (annotations: SpanAnnotationReadResolved[]) => {
    setAnnotations((prev) => {
      return {
        ...prev,
        [sdocId]: annotations,
      };
    });
  };

  // actions
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const createBulkAnnotationsMutation = SpanAnnotationHooks.useCreateBulkAnnotations();
  const handleApplySuggestedAnnotations = () => {
    if (!annotations) return;

    createBulkAnnotationsMutation.mutate(
      {
        requestBody: Object.entries(annotations).reduce((acc, [sdocId, sdocAnnos]) => {
          const sdocIdInt = parseInt(sdocId);
          for (const annotation of sdocAnnos) {
            acc.push({
              sdoc_id: sdocIdInt,
              code_id: annotation.code.id,
              begin: annotation.begin,
              end: annotation.end,
              begin_token: annotation.begin_token,
              end_token: annotation.end_token,
              span_text: annotation.text,
            });
          }
          return acc;
        }, [] as SpanAnnotationCreate[]),
      },
      {
        onSuccess: () => {
          dispatch(CRUDDialogActions.closeLLMDialog());
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            Here are the results! My suggestions are highlighted in the documents. Now, you can decide what to do with
            them. You can click on an annotation and either:
          </Typography>
          <ul style={{ margin: 0 }}>
            <li>Delete my suggestion</li>
            <li>Change the code of my annotated text passage</li>
          </ul>
          <Typography>Remember to look through all the documents.</Typography>
        </LLMUtterance>
        <TabContext value={tab}>
          <Box sx={{ mt: 3, borderBottom: 1, borderColor: "divider" }}>
            <TabList onChange={handleChangeTab}>
              {Object.keys(annotations).map((sdocId) => (
                <Tab key={sdocId} label={<SdocRenderer sdoc={parseInt(sdocId)} renderFilename />} value={sdocId} />
              ))}
            </TabList>
          </Box>
          {Object.entries(annotations).map(([sdocIdStr, annotations]) => {
            const sdocId = parseInt(sdocIdStr);
            return (
              <TabPanel key={sdocId} value={sdocIdStr} sx={{ px: 0, py: 1 }}>
                <TextAnnotationValidator
                  sdocId={sdocId}
                  codesForSelection={codesForSelection}
                  annotations={annotations}
                  handleChangeAnnotations={handleChangeAnnotations(sdocId)}
                />
              </TabPanel>
            );
          })}
        </TabContext>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Discard results & close</Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={createBulkAnnotationsMutation.isPending}
          loadingPosition="start"
          onClick={handleApplySuggestedAnnotations}
        >
          Apply annotations!
        </LoadingButton>
      </DialogActions>
    </>
  );
}

export default AnnotationResultStep;
