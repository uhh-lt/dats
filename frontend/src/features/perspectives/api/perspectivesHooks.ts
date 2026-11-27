import { queryClient } from "@api/queryClient";
import { JobService } from "@api/services/JobService";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { RagService } from "@api/services/RagService";
import { MyFilter } from "@core/filter";
import { AspectRead } from "@models/AspectRead";
import { VisualizationRequest } from "@models/VisualizationRequest";
import { ClusterRead } from "@models/ClusterRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { PerspectivesJobStart } from "@models/PerspectivesJobStart";
import { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import { SdocColumns } from "@models/SdocColumns";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AspectMap, perspectivesQueries } from "./perspectivesQueries";

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

const useGetAllAspectsMap = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T> = {}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...perspectivesQueries.aspectsByProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

const useGetAspect = (aspectId: number | null | undefined) =>
  useGetAllAspectsMap({
    select: (data) => data[aspectId!],
    enabled: !!aspectId,
  });

// the map thumbnail is served from /content/; enabled once the map is computed
const useGetMapThumbnailURL = (projectId: number, aspectId: number, enabled: boolean) =>
  useQuery({
    ...perspectivesQueries.mapThumbnailUrl(projectId, aspectId),
    select: (url) => (url === null ? null : encodeURI("/content/" + url)),
    enabled,
  });

const useCreateAspect = () =>
  useMutation({
    mutationKey: [...perspectivesQueries.all(), "createAspect"],
    mutationFn: PerspectivesService.create,
    meta: {
      datsEvent: "ASPECT_CREATED",
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

const useDeleteAspect = () =>
  useMutation({
    mutationKey: [...perspectivesQueries.all(), "deleteAspect"],
    mutationFn: PerspectivesService.deleteById,
    meta: {
      datsEvent: "ASPECT_DELETED",
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

const useStartPerspectivesJob = () =>
  useMutation({
    mutationKey: [...perspectivesQueries.job.all(), "start"],
    mutationFn: ({
      projectId,
      aspectId,
      requestBody,
    }: {
      projectId: number;
      aspectId: number;
      requestBody: PerspectivesJobStart["parameters"];
    }) => JobService.startPerspectivesJob({ projectId, requestBody: { aspect_id: aspectId, parameters: requestBody } }),
    meta: {
      datsEvent: "JOB_UPDATED",
      successMessage: (data: PerspectivesJobRead) => `Started TM Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useUpdateClusterDetails = () =>
  useMutation({
    mutationKey: [...perspectivesQueries.all(), "updateClusterDetails"],
    mutationFn: PerspectivesService.updateCluster,
    meta: {
      datsEvent: "CLUSTER_UPDATED",
      successMessage: (data: ClusterRead) => `Updated cluster ${data.name}`,
    },
  });

const useRAGChat = () =>
  useMutation({
    mutationKey: [...perspectivesQueries.all(), "rAGChat"],
    mutationFn: RagService.computeAnswers,
  });

const useGetDocVisualization = (aspectId: number) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useQuery({
    ...perspectivesQueries.visualization(projectId, aspectId, searchQuery, filter as MyFilter<SdocColumns>),
    placeholderData: (previous) => previous,
  });
};

// These two mutations read the perspectives slice (current search query and filter). They write the visualization they
// return into its cache themselves: the visualization depends on the search query and filter of this user, so there
// is no DATS event for it.

const useLabelDocs = (projectId: number, aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationKey: [...perspectivesQueries.all(), "labelDocs"],
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.acceptLabels({
        projectId,
        aspectId,
        requestBody: {
          search_query: searchQuery,
          sdoc_ids: sdocIds,
          filter: filter as VisualizationRequest["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        perspectivesQueries.visualization(projectId, aspectId, searchQuery, filter as VisualizationRequest["filter"])
          .queryKey,
        data,
      );
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Accepted cluster(s) for ${data.docs.length} documents`,
    },
  });
};

const useUnlabelDocs = (projectId: number, aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useMutation({
    mutationKey: [...perspectivesQueries.all(), "unlabelDocs"],
    mutationFn: (sdocIds: number[]) =>
      PerspectivesService.revertLabels({
        projectId,
        aspectId,
        requestBody: {
          search_query: searchQuery,
          sdoc_ids: sdocIds,
          filter: filter as VisualizationRequest["filter"],
          sorts: [],
        },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(
        perspectivesQueries.visualization(projectId, aspectId, searchQuery, filter as VisualizationRequest["filter"])
          .queryKey,
        data,
      );
    },
    meta: {
      successMessage: (data: PerspectivesVisualization) => `Reverted cluster(s) for ${data.docs.length} documents`,
    },
  });
};

export const PerspectivesHooks = {
  useGetMapThumbnailURL,
  useGetAspect,
  useCreateAspect,
  useDeleteAspect,
  useStartPerspectivesJob,
  useUpdateClusterDetails,
  useRAGChat,
  useGetDocVisualization,
  useLabelDocs,
  useUnlabelDocs,
};
