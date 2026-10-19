import { useLiveJob } from "@core/job";
import { MetadataExtractionLLMAssistantJobResult } from "@models/MetadataExtractionLLMAssistantJobResult";
import { Typography } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { memo } from "react";
import { llmAssistantQueries } from "../../../../api/llmAssistantQueries";
import { LLMAssistantUtterance } from "../LLMAssistantUtterance";
import { MetadataExtractionResultStepTable } from "./MetadataExtractionResultStepTable";

export const MetadataExtractionResultStep = memo(() => {
  // get the job
  const jobId = useAppSelector((state) => state.llmAssistant.jobId);
  const llmAssistantJob = useLiveJob(llmAssistantQueries.job.byId(jobId));

  return (
    <>
      <LLMAssistantUtterance p={3}>
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
      </LLMAssistantUtterance>
      {llmAssistantJob.isSuccess && (
        <MetadataExtractionResultStepTable
          data={
            (llmAssistantJob.data.output?.specific_task_result as MetadataExtractionLLMAssistantJobResult).results || []
          }
        />
      )}
    </>
  );
});
