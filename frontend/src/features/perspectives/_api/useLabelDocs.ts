import { perspectiveQueries } from "@api/queries/perspectiveQueries";
import { queryClient } from "@api/queryClient";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import { useAppSelector } from "@store/storeHooks";
import { useMutation } from "@tanstack/react-query";

// These two mutations read the perspectives slice (current search query and filter), which is why they live in the
// feature and not in api/hooks/PerspectivesHooks.ts.

export const useLabelDocs = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationKey: [...perspectiveQueries.all(), "labelDocs"],
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.acceptLabel({
        aspectId,
        searchQuery,
        requestBody: {
          sdoc_ids: sdocIds,
          filter: filter as Body_perspectives_visualize_documents["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        perspectiveQueries.visualization(
          aspectId,
          searchQuery,
          filter as Body_perspectives_visualize_documents["filter"],
        ).queryKey,
        data,
      );
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Accepted cluster(s) for ${data.docs.length} documents`,
    },
  });
};

export const useUnlabelDocs = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationKey: [...perspectiveQueries.all(), "unlabelDocs"],
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.revertLabel({
        aspectId,
        searchQuery,
        requestBody: {
          sdoc_ids: sdocIds,
          filter: filter as Body_perspectives_visualize_documents["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        perspectiveQueries.visualization(
          aspectId,
          searchQuery,
          filter as Body_perspectives_visualize_documents["filter"],
        ).queryKey,
        data,
      );
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Reverted cluster(s) for ${data.docs.length} documents`,
    },
  });
};
