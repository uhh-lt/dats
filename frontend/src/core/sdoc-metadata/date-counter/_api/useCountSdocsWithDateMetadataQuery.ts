import { AnalysisService } from "@api/services/AnalysisService";
import { useQuery } from "@tanstack/react-query";

export const useCountSdocsWithDateMetadataQuery = (projectId: number, dateMetadataId: number) =>
  useQuery({
    queryKey: ["sdocsWithDateMetadata", projectId, dateMetadataId],
    queryFn: () => AnalysisService.countSdocsWithDateMetadata({ projectId, dateMetadataId }),
  });
