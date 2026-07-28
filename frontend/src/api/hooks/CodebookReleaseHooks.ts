import { queryClient } from "@api/queryClient";
import { CodebookReleaseService } from "@api/services/CodebookReleaseService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

const useListReleases = (projectId: number, page: number, pageSize: number, query: string) =>
  useQuery({
    queryKey: [QueryKey.CODEBOOK_RELEASES, projectId, page, pageSize, query],
    queryFn: () => CodebookReleaseService.listReleases({ projectId, page, pageSize, query: query || undefined }),
  });

const useRelease = (releaseId: number | null) =>
  useQuery({
    queryKey: [QueryKey.CODEBOOK_RELEASE, releaseId],
    queryFn: () => {
      if (releaseId === null) throw new Error("A release is required");
      return CodebookReleaseService.getRelease({ releaseId });
    },
    enabled: releaseId !== null,
  });

const useComparison = (releaseId: number | null, targetReleaseId: number | null) =>
  useQuery({
    queryKey: [QueryKey.CODEBOOK_RELEASE_COMPARISON, releaseId, targetReleaseId ?? "latest"],
    queryFn: () => {
      if (releaseId === null) throw new Error("A base release is required");
      return CodebookReleaseService.compareRelease({ releaseId, targetReleaseId });
    },
    enabled: releaseId !== null,
  });

const useCreateRelease = () =>
  useMutation({
    mutationFn: CodebookReleaseService.createRelease,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.CODEBOOK_RELEASES, result.release.project_id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKey.CODE_FILTER_VERSION_SUMMARY, result.release.project_id],
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.CODE_FILTER_VERSIONS, result.release.project_id] });
    },
  });

export const CodebookReleaseHooks = {
  useListReleases,
  useRelease,
  useComparison,
  useCreateRelease,
};
