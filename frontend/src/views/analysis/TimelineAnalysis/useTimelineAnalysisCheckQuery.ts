import { useQuery } from "@tanstack/react-query";
import { AnalysisService } from "../../../api/openapi";

export const useTimelineAnalysisCheckQuery = (projectId: number, dateMetadataId: number) =>
  useQuery(["timelineAnalysisCheck", projectId, dateMetadataId], () =>
    AnalysisService.getTimelineAnalysisValidDocuments({ projectId, dateMetadataId }),
  );
