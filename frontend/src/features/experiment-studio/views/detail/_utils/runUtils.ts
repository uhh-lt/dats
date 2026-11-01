import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
import { PromptRead } from "@models/PromptRead";
import { PromptVersionRead } from "@models/PromptVersionRead";
import { TaskType } from "@models/TaskType";

export interface EligibleVersion {
  prompt: PromptRead;
  version: PromptVersionRead;
}

/**
 * The prompt versions that can run in the experiment: versions of the experiment's task whose codes are exactly the
 * experiment's codes, of prompts that are not archived. Newest versions first, grouped by prompt name.
 */
export function eligibleVersions(experiment: ExperimentRead, prompts: PromptRead[]): EligibleVersion[] {
  const codeIds = new Set(experiment.code_ids);
  return prompts
    .filter((prompt) => prompt.task_type === experiment.task_type && !prompt.is_archived)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((prompt) =>
      [...prompt.versions]
        .reverse()
        .filter((version) => {
          const versionCodeIds = new Set((version.codes ?? []).map((code) => code.code_id));
          return versionCodeIds.size === codeIds.size && [...codeIds].every((codeId) => versionCodeIds.has(codeId));
        })
        .map((version) => ({ prompt, version })),
    );
}

/** The search params of the comparison view of the gold annotator and the run's virtual user. */
export function comparisonSearch(experiment: ExperimentRead, run: ExperimentRunRead) {
  return {
    visibleUserId: experiment.gold_user_id,
    compareWithUserId: run.virtual_user_id,
    annotationMode: experiment.task_type === TaskType.ANNOTATION ? ("span" as const) : ("sentence" as const),
  };
}
