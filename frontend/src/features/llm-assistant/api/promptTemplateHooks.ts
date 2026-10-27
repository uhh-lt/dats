import { PromptTemplateService } from "@api/services/PromptTemplateService";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { StrategyType } from "@models/StrategyType";
import type { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { promptTemplateQueries } from "./promptTemplateQueries";

interface UseGetPromptTemplatesParams {
  projectId: number;
  taskType: TaskType | undefined;
  strategyType: StrategyType | undefined;
}

// the templates of a project that fit the task and strategy, sorted by name
const useGetPromptTemplates = ({ projectId, taskType, strategyType }: UseGetPromptTemplatesParams) =>
  useQuery({
    ...promptTemplateQueries.byProject(projectId),
    select: (data) =>
      Object.values(data)
        .filter((template) => template.task_type === taskType && template.strategy_type === strategyType)
        .sort((a, b) => a.name.localeCompare(b.name)),
  });

interface UseGetPromptTemplateVersionParams {
  projectId: number;
  versionId: number;
}

// a stored version together with its template (undefined if the template was deleted)
const useGetPromptTemplateVersion = ({ projectId, versionId }: UseGetPromptTemplateVersionParams) =>
  useQuery({
    ...promptTemplateQueries.byProject(projectId),
    select: (data) => {
      for (const template of Object.values(data)) {
        const version = template.versions.find((candidate) => candidate.id === versionId);
        if (version) return { template, version };
      }
      return undefined;
    },
  });

const useCreatePromptTemplate = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "createPromptTemplate"],
    mutationFn: PromptTemplateService.create,
    meta: {
      datsEvent: "PROMPT_TEMPLATE_CREATED",
      successMessage: (template: PromptTemplateRead) => `Saved prompt template ${template.name} (version 1)`,
    },
  });

const useCreatePromptTemplateVersion = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "createPromptTemplateVersion"],
    mutationFn: PromptTemplateService.createVersion,
    meta: {
      datsEvent: "PROMPT_TEMPLATE_UPDATED",
      successMessage: (template: PromptTemplateRead) =>
        `Saved version ${template.versions.length} of prompt template ${template.name}`,
    },
  });

export const PromptTemplateHooks = {
  useGetPromptTemplates,
  useGetPromptTemplateVersion,
  useCreatePromptTemplate,
  useCreatePromptTemplateVersion,
};
