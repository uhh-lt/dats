import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey.ts";
import { CodeFrequency } from "./openapi/models/CodeFrequency.ts";
import { CodeOccurrence } from "./openapi/models/CodeOccurrence.ts";
import { DocType } from "./openapi/models/DocType.ts";
import { TopWordsTopic } from "./openapi/models/TopWordsTopic.ts";
import { AnalysisService } from "./openapi/services/AnalysisService.ts";

const useCodeFrequencies = (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
  useQuery<CodeFrequency[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId, userIds, codeIds, docTypes],
    queryFn: () =>
      AnalysisService.codeFrequencies({
        projectId,
        requestBody: {
          user_ids: userIds,
          code_ids: codeIds,
          doctypes: docTypes,
        },
      }),
  });

const useCodeOccurrences = (projectId: number, userIds: number[], codeId: number | null | undefined) =>
  useQuery<CodeOccurrence[], Error>({
    queryKey: [QueryKey.ANALYSIS_CODE_OCCURRENCES, projectId, userIds, codeId],
    queryFn: () =>
      AnalysisService.codeOccurrences({
        projectId,
        codeId: codeId!,
        requestBody: userIds,
      }),
    enabled: userIds.length > 0 && !!codeId,
  });

const useReturnTopicDistrData = (project_id: number) =>
  useQuery<Array<Record<string, unknown>>, Error>({
    queryKey: ["TopicDistrData", project_id],
    queryFn: () => AnalysisService.returnTopicDistrData({ projectId: project_id }),
  });

const useReturnTopWordsData = (project_id: number) =>
  useQuery<Record<string, TopWordsTopic>, Error>({
    queryKey: ["TopWordsData", project_id],
    queryFn: () => AnalysisService.returnTopWordsData({ projectId: project_id }),
  });

// change name to action name
const useReturnTopWordsOllama = (topic_id: number, project_id: number) =>
  useMutation({
    mutationFn: () => AnalysisService.returnTopWordsOllama({ topicId: topic_id, projectId: project_id }),
  });

const useReturnTopicDocuments = (project_id: number, topic_id: number) => {
  return useQuery<Array<Record<string, unknown>>, Error>({
    queryKey: ["TopicDocuments", project_id, topic_id],
    queryFn: () => AnalysisService.returnTopicDocumentData({ topicId: topic_id, projectId: project_id }),
  });
};

const AnalysisHooks = {
  useCodeFrequencies,
  useCodeOccurrences,
  useReturnTopicDistrData,
  useReturnTopWordsData,
  useReturnTopWordsOllama,
  useReturnTopicDocuments,
};

export default AnalysisHooks;
