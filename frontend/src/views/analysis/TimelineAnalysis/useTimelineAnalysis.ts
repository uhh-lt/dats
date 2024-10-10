import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { useCallback } from "react";
import { useParams } from "react-router-dom";
import { TimelineAnalysisColumns } from "../../../api/openapi/models/TimelineAnalysisColumns.ts";
import { TimelineAnalysisRead } from "../../../api/openapi/models/TimelineAnalysisRead.ts";
import { TimelineAnalysisResult } from "../../../api/openapi/models/TimelineAnalysisResult.ts";
import { TimelineAnalysisService } from "../../../api/openapi/services/TimelineAnalysisService.ts";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";

export interface TimelineAnalysisCount {
  date: string;
  [key: string]: number | string;
}

export const useTimelineAnalysis = (timelineAnalysis: TimelineAnalysisRead) => {
  // global client state (react router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const combineResults = useCallback(
    (result: UseQueryResult<TimelineAnalysisResult[], Error>[]) => {
      const isLoading = result.some((query) => query.isLoading);
      const isError = result.some((query) => query.isError);
      const isSuccess = result.every((query) => query.isSuccess);
      if (!isSuccess) {
        return {
          counts: [],
          date2concept2ids: {},
          isSuccess,
          isLoading,
          isError,
        };
      }

      // merge results
      const timelineAnalysisResults = result.map((query) => query.data!);
      // the keys of the intermediate result
      const dates = Array.from(new Set(timelineAnalysisResults.flat().map((result) => result.date)));

      // results as maps
      const date2concept2counts: Record<string, Record<string, number>> = dates.reduce(
        (previousValue, currentValue) => {
          return { ...previousValue, [currentValue]: {} };
        },
        {},
      );
      const date2concept2ids: Record<string, Record<string, number[]>> = dates.reduce((previousValue, currentValue) => {
        return { ...previousValue, [currentValue]: {} };
      }, {});

      timelineAnalysisResults.forEach((taResult, index) => {
        const concept = timelineAnalysis.concepts[index]; //  The order returned by useQueries is the same as the input order.

        taResult.forEach((result) => {
          date2concept2counts[result.date][concept.name] = result.sdoc_ids.length;
          date2concept2ids[result.date][concept.name] = result.sdoc_ids;
        });
      });

      // results as list (as required by recharts)
      const counts: TimelineAnalysisCount[] = dates.map((date) => {
        return {
          date,
          ...date2concept2counts[date],
        };
      });

      return {
        counts,
        date2concept2ids,
        isSuccess,
        isLoading,
        isError,
      };
    },
    [timelineAnalysis.concepts],
  );

  return useQueries({
    queries: timelineAnalysis.concepts.map((concept) => {
      return {
        queryKey: [
          projectId,
          timelineAnalysis.settings.group_by,
          timelineAnalysis.settings.date_metadata_id,
          concept.filter,
        ],
        queryFn: () => {
          return TimelineAnalysisService.doAnalysis({
            projectId,
            groupBy: timelineAnalysis.settings.group_by!,
            projectMetadataId: timelineAnalysis.settings.date_metadata_id!,
            requestBody: concept.filter as MyFilter<TimelineAnalysisColumns>, // if concept.type === "filter", data is the root filter id
          });
        },
        enabled: !!timelineAnalysis.settings.group_by && !!timelineAnalysis.settings.date_metadata_id,
      };
    }),
    combine: combineResults,
  });
};
