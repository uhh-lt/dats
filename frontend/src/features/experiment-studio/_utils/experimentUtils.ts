import { AgreementScoring } from "@models/AgreementScoring";
import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
import { ExperimentRunScores } from "@models/ExperimentRunScores";
import { JobStatus } from "@models/JobStatus";

// a run keeps the state of its job: queued, started, finished or failed
export const RUN_STATUSES = [JobStatus.QUEUED, JobStatus.STARTED, JobStatus.FINISHED, JobStatus.FAILED];

export const RUN_STATUS_COLORS: Partial<Record<JobStatus, "default" | "info" | "success" | "error">> = {
  [JobStatus.QUEUED]: "default",
  [JobStatus.STARTED]: "info",
  [JobStatus.FINISHED]: "success",
  [JobStatus.FAILED]: "error",
};

/** A score between 0 and 1 with two decimals, "–" if it is undefined (no counts). */
export function formatScore(score: number | null | undefined): string {
  return score === null || score === undefined ? "–" : score.toFixed(2);
}

/** The stored scores of a run with one scoring, undefined until they are computed. */
export function findScores(run: ExperimentRunRead, scoring: AgreementScoring): ExperimentRunScores | undefined {
  return run.scores.find((scores) => scores.scoring === scoring);
}

/** The best overall F1 of the experiment's runs with one scoring, undefined without scores. */
export function bestF1(experiment: ExperimentRead, scoring: AgreementScoring): number | undefined {
  const f1s = experiment.runs
    .map((run) => findScores(run, scoring)?.total.f1)
    .filter((f1): f1 is number => typeof f1 === "number");
  return f1s.length > 0 ? Math.max(...f1s) : undefined;
}

/** The model name without its provider and organization, e.g. "DeepSeek-V4.1-Flash" of "vllm/deepseek-ai/DeepSeek-V4.1-Flash". */
export function shortModelName(model: string): string {
  return model.split("/").pop() || model;
}
