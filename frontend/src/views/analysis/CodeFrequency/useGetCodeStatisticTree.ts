import { useQuery } from "@tanstack/react-query";
import { CodeRead, ProjectService, SearchService, SourceDocumentRead } from "../../../api/openapi";

export interface Statistic {
  id: number;
  sdoc: SourceDocumentRead | undefined;
  code: CodeRead | undefined;
  text: string;
  count: number;
}

export interface CodeStatistics {
  code: CodeRead | undefined;
  name: string;
  aggregatedCount: number;
  count: number;
  spans: Statistic[];
  children: CodeStatistics[];
}

export const useGetCodeStatisticTree = (projectId: number) =>
  useQuery<CodeStatistics, Error>(["temp", projectId], async () => {
    // get all documents
    const allProjectDocuments = await ProjectService.getProjectSdocsProjectProjIdSdocGet({
      projId: projectId,
      limit: 1000,
    });
    const documentMap = new Map<number, SourceDocumentRead>();
    allProjectDocuments.sdocs.forEach((sdoc) => documentMap.set(sdoc.id, sdoc));

    // get all codes
    const allProjectCodes = await ProjectService.getProjectCodesProjectProjIdCodeGet({
      projId: projectId,
    });
    const codeMap = new Map<number, CodeRead>();
    allProjectCodes.forEach((code) => codeMap.set(code.id, code));

    // get stats for all documents
    const temp = await SearchService.searchSpanEntityStatsSearchEntityStatsPost({
      requestBody: { proj_id: projectId },
    });

    // map query results to own data type
    const stats: Statistic[] = temp.map((stat, index) => ({
      id: index, // todo that is not a good id!
      sdoc: documentMap.get(stat.sdoc_id),
      code: codeMap.get(stat.code_id),
      text: stat.span_text,
      count: stat.count,
    }));

    // create a map of codeId -> Statistic
    const codeIdToStatsMap = new Map<number, CodeStatistics>();

    // init map
    allProjectCodes.forEach((code) => {
      codeIdToStatsMap.set(code.id, {
        code,
        aggregatedCount: 0,
        count: 0,
        spans: [],
        children: [],
        name: code.name,
      });
    });

    // fill map
    stats.forEach((stat) => {
      codeIdToStatsMap.get(stat.code!.id)!.spans.push(stat);
    });

    // compute counts for each code (sum of all spans)
    codeIdToStatsMap.forEach((value) => {
      value.count = value.spans.reduce((acc, cur) => acc + cur.count, 0);
      value.aggregatedCount = value.count;
    });

    // aggregate counts with the code hierarchy: e.g. if named entity occurs 3 times, and PER occurs 2 times, then named entity aggregated count = 5
    // (PER is child of named entity)
    allProjectCodes.forEach((code) => {
      if (code.parent_code_id) {
        codeIdToStatsMap.get(code.parent_code_id)!.aggregatedCount += codeIdToStatsMap.get(code.id)!.count;
      }
    });

    // convert codeIdToStatsMap to a tree
    const root: CodeStatistics = {
      aggregatedCount: 0,
      count: 0,
      spans: [],
      children: [],
      code: undefined,
      name: "root",
    };
    allProjectCodes.forEach((code) => {
      const codeStatistic = codeIdToStatsMap.get(code.id)!;
      if (code.parent_code_id) {
        codeIdToStatsMap.get(code.parent_code_id)!.children.push(codeStatistic);
      } else {
        root.children.push(codeStatistic);
      }
    });

    // return root of the tree
    return root;
  });
