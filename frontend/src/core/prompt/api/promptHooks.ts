import { PromptService } from "@api/services/PromptService";
import type { PromptRead } from "@models/PromptRead";
import type { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { promptQueries } from "./promptQueries";

interface UseGetAllPromptsParams {
  projectId: number;
  taskType?: TaskType;
  includeArchived?: boolean;
}

// the prompts of a project, optionally only those of a task, sorted by name
const useGetAllPrompts = ({ projectId, taskType, includeArchived = false }: UseGetAllPromptsParams) =>
  useQuery({
    ...promptQueries.byProject(projectId),
    select: (data) =>
      Object.values(data)
        .filter(
          (prompt) =>
            (includeArchived || !prompt.is_archived) && (taskType === undefined || prompt.task_type === taskType),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
  });

interface UseGetPromptParams {
  projectId: number;
  promptId: number | undefined;
}

// one prompt of the project (undefined if it does not exist)
const useGetPrompt = ({ projectId, promptId }: UseGetPromptParams) =>
  useQuery({
    ...promptQueries.byProject(projectId),
    select: (data) => (promptId === undefined ? undefined : data[promptId]),
  });

interface UseGetPromptVersionParams {
  projectId: number;
  versionId: number | undefined;
}

// a stored version together with its prompt (undefined if it does not exist)
const useGetPromptVersion = ({ projectId, versionId }: UseGetPromptVersionParams) =>
  useQuery({
    ...promptQueries.byProject(projectId),
    select: (data) => {
      for (const prompt of Object.values(data)) {
        const version = prompt.versions.find((candidate) => candidate.id === versionId);
        if (version) return { prompt, version };
      }
      return undefined;
    },
  });

const useCreatePrompt = () =>
  useMutation({
    mutationKey: [...promptQueries.all(), "createPrompt"],
    mutationFn: PromptService.create,
    meta: {
      datsEvent: "PROMPT_CREATED",
      successMessage: (prompt: PromptRead) => `Created prompt ${prompt.name}`,
    },
  });

const useCreatePromptVersion = () =>
  useMutation({
    mutationKey: [...promptQueries.all(), "createPromptVersion"],
    mutationFn: PromptService.createVersion,
    meta: {
      datsEvent: "PROMPT_UPDATED",
      successMessage: (prompt: PromptRead) => `Saved version ${prompt.versions.length} of prompt ${prompt.name}`,
    },
  });

const useUpdatePrompt = () =>
  useMutation({
    mutationKey: [...promptQueries.all(), "updatePrompt"],
    mutationFn: PromptService.updateById,
    meta: {
      datsEvent: "PROMPT_UPDATED",
      successMessage: (prompt: PromptRead) => `Updated prompt ${prompt.name}`,
    },
  });

// turns annotations into few-shot examples; the result only lives in the editor until it is saved
const useCreatePromptExamples = () =>
  useMutation({
    mutationKey: [...promptQueries.all(), "createPromptExamples"],
    mutationFn: PromptService.createExamples,
  });

export const PromptHooks = {
  useGetAllPrompts,
  useGetPrompt,
  useGetPromptVersion,
  useCreatePrompt,
  useCreatePromptVersion,
  useUpdatePrompt,
  useCreatePromptExamples,
};
