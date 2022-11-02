import { useQuery } from "@tanstack/react-query";
import { AnalysisService, CodeRead, SourceDocumentRead } from "./openapi";
import { QueryKey } from "./QueryKey";
import { SYSTEM_USER_ID } from "../utils/GlobalConstants";

// todo: temp! Delete when backend route is typed
export interface ICodeOccurrence {
  sdoc: SourceDocumentRead;
  code: CodeRead;
  text: string;
  count: number;
}

export interface ICodeFrequencies {
  code: CodeRead | undefined;
  count: number;
  aggregated_count: number;
  occurrences: ICodeOccurrence[];
  children: ICodeFrequencies[];
}

const useAnalyseCodeFrequencies = (projectId: number) =>
  useQuery<ICodeFrequencies, Error>([QueryKey.ANALYSIS_CODE_FREQUENCIES, projectId], () =>
    AnalysisService.frequencyAnalysis({
      requestBody: {
        proj_id: projectId,
        user_ids: [SYSTEM_USER_ID],
      },
    })
  );

const AnalysisHooks = {
  useAnalyseCodeFrequencies,
};

export default AnalysisHooks;
