import { useQuery } from "@tanstack/react-query";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";

export const useTimelineAnalysisCheckQuery = (projectId: number, dateMetadataId: number) =>
  useQuery({
    queryKey: ["timelineAnalysisCheck", projectId, dateMetadataId],
    queryFn: () => AnalysisService.getTimelineAnalysisValidDocuments({ projectId, dateMetadataId }),
  });
