import { handleDATSEvent } from "@api/cache-sync";
import { PromptTemplateService } from "@api/services/PromptTemplateService";
import type { PromptSelections } from "@models/PromptSelections";
import type { PromptTemplateRead } from "@models/PromptTemplateRead";
import type { PushedPromptSelections } from "@models/PushedPromptSelections";
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
      successMessage: (template: PromptTemplateRead) => `Created prompt ${template.name}`,
    },
  });

const useCreatePromptTemplateVersion = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "createPromptTemplateVersion"],
    mutationFn: PromptTemplateService.createVersion,
    meta: {
      datsEvent: "PROMPT_TEMPLATE_UPDATED",
      successMessage: (template: PromptTemplateRead) =>
        `Saved version ${template.versions.length} of prompt ${template.name}`,
    },
  });

const useUpdatePromptTemplate = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "updatePromptTemplate"],
    mutationFn: PromptTemplateService.updateById,
    meta: {
      datsEvent: "PROMPT_TEMPLATE_UPDATED",
      successMessage: (template: PromptTemplateRead) => `Updated prompt ${template.name}`,
    },
  });

// turns annotations into few-shot examples; the result only lives in the editor until it is saved
const useCreatePromptExamples = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "createPromptExamples"],
    mutationFn: PromptTemplateService.createExamples,
  });

// returns the project's definitions of selections; the result only lives in the editor until it is saved
const usePullSelections = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "pullSelections"],
    mutationFn: PromptTemplateService.pullSelections,
    meta: {
      successMessage: (pulled: PromptSelections) =>
        `Pulled ${countSelections(pulled)} definition(s) from the project into the prompt`,
    },
  });

// writes the prompt's definitions into the project's codes, tags and metadata fields
const usePushSelections = () =>
  useMutation({
    mutationKey: [...promptTemplateQueries.all(), "pushSelections"],
    mutationFn: PromptTemplateService.pushSelections,
    // a push updates several entities, so each one is forwarded like the result of its own update mutation
    onSuccess: (pushed: PushedPromptSelections) => {
      pushed.codes.forEach((payload) => handleDATSEvent({ type: "CODE_UPDATED", payload }, "mutation"));
      pushed.tags.forEach((payload) => handleDATSEvent({ type: "TAG_UPDATED", payload }, "mutation"));
      pushed.metadata_fields.forEach((payload) =>
        handleDATSEvent({ type: "PROJECT_METADATA_UPDATED", payload }, "mutation"),
      );
    },
    meta: {
      successMessage: (pushed: PushedPromptSelections) =>
        `Pushed ${countSelections(pushed)} definition(s) from the prompt to the project`,
      errorMessage: "Could not push to the project",
    },
  });

const countSelections = (selections: PromptSelections | PushedPromptSelections) =>
  (selections.codes?.length ?? 0) + (selections.tags?.length ?? 0) + (selections.metadata_fields?.length ?? 0);

export const PromptTemplateHooks = {
  useGetAllPromptTemplates,
  useGetPromptTemplate,
  useGetPromptTemplateVersion,
  useCreatePromptTemplate,
  useCreatePromptTemplateVersion,
  useUpdatePromptTemplate,
  useCreatePromptExamples,
  usePullSelections,
  usePushSelections,
};
