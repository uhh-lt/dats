import { TabContext, TabList, TabPanel } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Tab, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { AnnotationLLMJobResult } from "../../../../api/openapi/models/AnnotationLLMJobResult.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import SdocRenderer from "../../../SourceDocument/SdocRenderer.tsx";
import SpanAnnotationRenderer from "../../../SpanAnnotation/SpanAnnotationRenderer.tsx";
import LLMUtterance from "../LLMUtterance.tsx";

function AnnotationResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  // local state (to manage tabs)
  const [tab, setTab] = useState<string>();
  const handleChangeTab = (_: React.SyntheticEvent, newValue: string) => {
    setTab(newValue);
  };
  useEffect(() => {
    if (llmJob.data) {
      setTab((llmJob.data.result?.specific_llm_job_result as AnnotationLLMJobResult).results[0].sdoc_id.toString());
    }
  }, [llmJob.data]);

  // actions
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            Here are the results! You can find my suggestions in the columns marked with <i>(suggested)</i>. Now, you
            decide what to do with them:
          </Typography>
          <ul style={{ margin: 0 }}>
            <li>Use your current metadata values (discarding my suggestions)</li>
            <li>Use my suggested metadata values (discarding the current value)</li>
          </ul>
          <Typography>
            Of course, you can decided individually for each document. Just click on the value you want to use.
          </Typography>
        </LLMUtterance>
        {llmJob.isSuccess && llmJob.data.result && tab && (
          <TabContext value={tab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <TabList onChange={handleChangeTab}>
                {(llmJob.data.result.specific_llm_job_result as AnnotationLLMJobResult).results.map(
                  (annotationResult) => (
                    <Tab
                      key={annotationResult.sdoc_id}
                      label={<SdocRenderer sdoc={annotationResult.sdoc_id} renderFilename />}
                      value={annotationResult.sdoc_id.toString()}
                    />
                  ),
                )}
              </TabList>
            </Box>
            {(llmJob.data.result.specific_llm_job_result as AnnotationLLMJobResult).results.map((annotationResult) => (
              <TabPanel key={annotationResult.sdoc_id} value={annotationResult.sdoc_id.toString()} sx={{ px: 0 }}>
                {annotationResult.suggested_annotations.map((annotation, idx) => (
                  <SpanAnnotationRenderer key={idx} spanAnnotation={annotation} />
                ))}
              </TabPanel>
            ))}
          </TabContext>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Discard results & close</Button>
      </DialogActions>
    </>
  );
}

export default AnnotationResultStep;
