import { queryClient } from "@api/queryClient";
import { PerspectivesService } from "@api/services/PerspectivesService";
import { RagService } from "@api/services/RagService";
import { MyFilter } from "@core/filter";
import { AspectRead } from "@models/AspectRead";
import { Body_perspectives_visualize_documents } from "@models/Body_perspectives_visualize_documents";
import { ClusterRead } from "@models/ClusterRead";
import { CodeRead } from "@models/CodeRead";
import { PerspectivesJobRead } from "@models/PerspectivesJobRead";
import { PerspectivesVisualization } from "@models/PerspectivesVisualization";
import { SdocColumns } from "@models/SdocColumns";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AspectMap, perspectiveQueries } from "./perspectiveQueries";

interface UseProjectAspectsQueryParams<T> {
  select?: (data: AspectMap) => T;
  enabled?: boolean;
}

const useProjectAspectsQuery = <T = AspectMap>({ select, enabled }: UseProjectAspectsQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...perspectiveQueries.aspectsByProject(projectId!),
    select,
    enabled: projectId !== undefined && (enabled ?? true),
  });
};

const useGetAspect = (aspectId: number | null | undefined) =>
  useProjectAspectsQuery({
    select: (data) => data[aspectId!],
    enabled: !!aspectId,
  });

const useGetAllAspectsList = () => useProjectAspectsQuery({ select: (data) => Object.values(data) });

const useCreateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "createAspect"],
    mutationFn: PerspectivesService.createAspect,
    meta: {
      datsEvent: "ASPECT_CREATED",
      successMessage: (data: AspectRead) => `Created aspect ${data.name}`,
    },
  });

const useUpdateAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "updateAspect"],
    mutationFn: PerspectivesService.updateAspectById,
    meta: {
      datsEvent: "ASPECT_UPDATED",
      successMessage: (data: CodeRead) => `Updated aspect ${data.name}`,
    },
  });

const useDeleteAspect = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "deleteAspect"],
    mutationFn: PerspectivesService.removeAspectById,
    meta: {
      datsEvent: "ASPECT_DELETED",
      successMessage: (data: AspectRead) => `Deleted aspect ${data.name}`,
    },
  });

const useStartPerspectivesJob = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.job.all(), "start"],
    mutationFn: PerspectivesService.startPerspectivesJob,
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: perspectiveQueries.aspectsByProject(job.project_id).queryKey });
      queryClient.invalidateQueries({ queryKey: perspectiveQueries.job.byId(job.job_id).queryKey });
    },
    meta: {
      successMessage: (data: PerspectivesJobRead) => `Started TM Job as a new background task (ID: ${data.job_id})`,
    },
  });

const useUpdateClusterDetails = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "updateClusterDetails"],
    mutationFn: PerspectivesService.updateClusterDetails,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: perspectiveQueries.visualizationOfAspectScope(data.aspect_id) });
    },
    meta: {
      successMessage: (data: ClusterRead) => `Updated cluster ${data.name}`,
    },
  });

const useRAGChat = () =>
  useMutation({
    mutationKey: [...perspectiveQueries.all(), "rAGChat"],
    mutationFn: RagService.ragSession,
  });

const useGetDocVisualization = (aspectId: number) => {
  const searchQuery = useAppSelector((state) => state.perspectives.searchQuery);
  const filter = useAppSelector((state) => state.perspectives.filter[`aspect-${aspectId}`]);
  return useQuery({
    ...perspectiveQueries.visualization(aspectId, searchQuery, filter as MyFilter<SdocColumns>),
    placeholderData: (previous) => previous,
  });
};

// These two mutations read the perspectives slice (current search query and filter), which is why they live in the
// feature and not in perspectivesMutations.ts.

const useLabelDocs = (aspectId: number) => {
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

const useUnlabelDocs = (aspectId: number) => {
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

export const PerspectivesHooks = {
  useProjectAspectsQuery,
  useGetAspect,
  useGetAllAspectsList,
  useCreateAspect,
  useUpdateAspect,
  useDeleteAspect,
  useStartPerspectivesJob,
  useUpdateClusterDetails,
  useRAGChat,
  useGetDocVisualization,
  useLabelDocs,
  useUnlabelDocs,
};
