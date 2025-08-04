import { Typography } from "@mui/material";
import { memo } from "react";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { MetadataExtractionLLMJobResult } from "../../../../api/openapi/models/MetadataExtractionLLMJobResult.ts";
import { useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import LLMUtterance from "../LLMUtterance.tsx";
import MetadataExtractionResultStepTable from "./MetadataExtractionResultStepTable.tsx";

function MetadataExtractionResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  return (
    <>
      <LLMUtterance p={3}>
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
      {llmJob.isSuccess && (
        <MetadataExtractionResultStepTable
          data={(llmJob.data.output?.specific_task_result as MetadataExtractionLLMJobResult).results || []}
        />
      )}
    </>
  );
}

export default memo(MetadataExtractionResultStep);
