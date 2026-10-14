import { DocType } from "@models/DocType";
import { useQuery } from "@tanstack/react-query";
import { codeFrequencyQueries } from "./codeFrequencyQueries";

const useCodeFrequenciesQuery = (projectId: number, userIds: number[], codeIds: number[], docTypes: DocType[]) =>
  useQuery(codeFrequencyQueries.frequencies(projectId, userIds, codeIds, docTypes));

const useCodeOccurrencesQuery = (
  projectId: number,
  userIds: number[],
  codeId: number | null | undefined,
  docTypes: DocType[],
  returnChildren: boolean,
) =>
  useQuery({
    ...codeFrequencyQueries.occurrences(projectId, userIds, codeId, docTypes, returnChildren),
    enabled: userIds.length > 0 && docTypes.length > 0,
  });

export const CodeFrequencyHooks = {
  useCodeFrequenciesQuery,
  useCodeOccurrencesQuery,
};
