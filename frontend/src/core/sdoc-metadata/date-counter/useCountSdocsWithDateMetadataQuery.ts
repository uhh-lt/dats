import { useQuery } from "@tanstack/react-query";
import { AnalysisService } from "../../../api/openapi/services/AnalysisService.ts";

export const useCountSdocsWithDateMetadataQuery = (projectId: number, dateMetadataId: number) =>
  useQuery({
    queryKey: ["sdocsWithDateMetadata", projectId, dateMetadataId],
    queryFn: () => AnalysisService.countSdocsWithDateMetadata({ projectId, dateMetadataId }),
  });
