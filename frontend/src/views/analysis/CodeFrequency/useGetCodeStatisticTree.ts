import { useQuery } from "@tanstack/react-query";
import { CodeRead, DocType, ProjectService, SearchService } from "../../../api/openapi";

export interface Statistic {
  sdocId: number;
  codeId: number;
  text: string;
  count: number;
}

export interface CodeStatistics {
  codeId: number;
  code: CodeRead | undefined;
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

    // get stats for all documents
    const statQueries = allProjectDocuments
      .filter((sdoc) => sdoc.doctype === DocType.TEXT)
      .map((sdoc) =>
        SearchService.searchStatsSearchStatsPost({
          requestBody: { proj_id: projectId, sdoc_ids: [sdoc.id] },
          limit: 1000,
        })
      );
    const temp = (await Promise.all(statQueries)).flat();
    const stats: Statistic[] = temp.map((stat) => ({
      sdocId: stat.sdoc_id,
      codeId: stat.span_entity.code_id,
      text: stat.span_entity.span_text,
      count: stat.count,
    }));

    // get all codes
    const allProjectCodes = await ProjectService.getProjectCodesProjectProjIdCodeGet({
      projId: projectId,
    });

    // create a map of codeId -> Statistic
    const codeIdToStatsMap = new Map<number, CodeStatistics>();
    stats.forEach((stat) => {
      if (!codeIdToStatsMap.has(stat.codeId)) {
        codeIdToStatsMap.set(stat.codeId, {
          codeId: stat.codeId,
          code: undefined,
          aggregatedCount: 0,
          count: 0,
          spans: [],
          children: [],
        });
      }
      codeIdToStatsMap.get(stat.codeId)!.spans.push(stat);
    });

    // compute counts for each code (sum of all spans)
    codeIdToStatsMap.forEach((value) => {
      value.count = value.spans.reduce((acc, cur) => acc + cur.count, 0);
    });

    // aggregate counts with the code hierarchy: e.g. if named entity occurs 3 times, and PER occurs 2 times, then named entity aggregated count = 5
    // (PER is child of named entity)
    allProjectCodes.forEach((code) => {
      if (code.parent_code_id) {
        codeIdToStatsMap.get(code.parent_code_id)!.aggregatedCount += codeIdToStatsMap.get(code.id)!.count;
      }
    });

    // convert codeIdToStatsMap to a tree
    const root: CodeStatistics = { aggregatedCount: 0, codeId: 0, count: 0, spans: [], children: [], code: undefined };
    allProjectCodes.forEach((code) => {
      const codeStatistic = codeIdToStatsMap.get(code.id)!;
      codeStatistic.code = code;
      if (code.parent_code_id) {
        codeIdToStatsMap.get(code.parent_code_id)!.children.push(codeStatistic);
      } else {
        root.children.push(codeStatistic);
      }
    });

    // return root of the tree
    return root;
  });
