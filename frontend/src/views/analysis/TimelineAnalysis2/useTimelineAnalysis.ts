import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { AnalysisService } from "../../../api/openapi";
import { useFilterSliceSelector } from "../../../features/FilterDialog/FilterProvider";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { useParams } from "react-router-dom";

export interface TimelineAnalysisCount {
  date: string;
  [key: string]: number | string;
}

interface TimelineAnalysisIds {
  date: string;
  [key: string]: number[] | string;
}

export const useTimelineAnalysis = () => {
  // global client state (react router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // global client state (redux)
  const groupBy = useAppSelector((state) => state.timelineAnalysis.groupBy);
  const projectMetadatId = useAppSelector((state) => state.timelineAnalysis.projectMetadataId);
  const concepts = useAppSelector((state) => state.timelineAnalysis.concepts);
  const filter = useFilterSliceSelector().filter;

  const timelineAnalysis = useQueries({
    queries: concepts.map((concept) => {
      return {
        queryKey: [projectId, groupBy, projectMetadatId, filter[concept.data], concept],
        queryFn: () => {
          return AnalysisService.timelineAnalysis2({
            projectId,
            groupBy,
            projectMetadataId: projectMetadatId,
            requestBody: filter[concept.data], // if concept.type === "filter", data is the root filter id
          });
        },
      };
    }),
  });

  const isLoading = timelineAnalysis.some((query) => query.isLoading);
  const isError = timelineAnalysis.some((query) => query.isError);

  // TODO: Is this memo stable? or is it computed every re-render?
  const { counts, date2concept2ids, isSuccess } = useMemo(() => {
    if (!timelineAnalysis.every((query) => query.isSuccess))
      return { counts: [], date2concept2ids: {}, isSuccess: false };
    const a = timelineAnalysis.map((query) => query.data!);

    // merge results
    // the keys of the intermediate result
    const dates = Array.from(new Set(a.flat().map((result) => result.date)));

    // results as maps
    const date2concept2counts: Record<string, Record<string, number>> = dates.reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue]: {} };
    }, {});
    const date2concept2ids: Record<string, Record<string, number[]>> = dates.reduce((previousValue, currentValue) => {
      return { ...previousValue, [currentValue]: {} };
    }, {});

    a.forEach((taResult, index) => {
      const concept = concepts[index]; //  The order returned by useQueries is the same as the input order.

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

    return { counts, date2concept2ids, isSuccess: true };
  }, [concepts, timelineAnalysis]);

  return { isSuccess, isLoading, isError, counts, date2concept2ids };
};