import { PromptTemplateService } from "@api/services/PromptTemplateService";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { TaskType } from "@models/TaskType";
import { useMutation, useQuery } from "@tanstack/react-query";
import { promptTemplateQueries } from "./promptTemplateQueries";

interface UseGetAllPromptTemplatesParams {
  projectId: number;
  taskType?: TaskType;
  includeArchived?: boolean;
}

// the templates of a project, optionally only those of a task, sorted by name
const useGetAllPromptTemplates = ({ projectId, taskType, includeArchived = false }: UseGetAllPromptTemplatesParams) =>
  useQuery({
    ...promptTemplateQueries.byProject(projectId),
    select: (data) =>
      Object.values(data)
        .filter(
          (template) =>
            (includeArchived || !template.is_archived) && (taskType === undefined || template.task_type === taskType),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
  });

interface UseGetPromptTemplateParams {
  projectId: number;
  promptTemplateId: number | undefined;
}

// one template of the project (undefined if it does not exist)
const useGetPromptTemplate = ({ projectId, promptTemplateId }: UseGetPromptTemplateParams) =>
  useQuery({
    ...promptTemplateQueries.byProject(projectId),
    select: (data) => (promptTemplateId === undefined ? undefined : data[promptTemplateId]),
  });

interface UseGetPromptTemplateVersionParams {
  projectId: number;
  versionId: number | undefined;
}

// a stored version together with its template (undefined if it does not exist)
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
      successMessage: (template: PromptTemplateRead) => `Created prompt template ${template.name}`,
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

const useUpdatePromptTemplate = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "updatePromptTemplate"],
    mutationFn: PromptTemplateService.updateById,
    meta: {
      datsEvent: "PROMPT_TEMPLATE_UPDATED",
      successMessage: (template: PromptTemplateRead) => `Updated prompt template ${template.name}`,
    },
  });

// turns annotations into few-shot examples; the result only lives in the editor until it is saved
const useCreatePromptExamples = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "createPromptExamples"],
    mutationFn: PromptTemplateService.createExamples,
  });

// replaces the selections of the editor's draft with the current state of the project
const useRefreshPromptContent = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "refreshPromptContent"],
    mutationFn: PromptTemplateService.refresh,
    meta: {
      successMessage: "Updated the codes, examples, tags and metadata fields to the current project state",
    },
  });

export const PromptTemplateHooks = {
  useGetAllPromptTemplates,
  useGetPromptTemplate,
  useGetPromptTemplateVersion,
  useCreatePromptTemplate,
  useCreatePromptTemplateVersion,
  useUpdatePromptTemplate,
  useCreatePromptExamples,
  useRefreshPromptContent,
};
