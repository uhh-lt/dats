import { queryClient } from "@api/queryClient";
import { TagService } from "@api/services/TagService";
import { SdocTagLinks } from "@models/SdocTagLinks";
import { TagRead } from "@models/TagRead";
import { useAppSelector } from "@store/storeHooks";
import { queryOptions, useMutation, useQuery } from "@tanstack/react-query";
import { QueryKey } from "./QueryKey";

// TAG QUERIES
export const projectTagsQueryOptions = (projectId: number | undefined) =>
  queryOptions({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () =>
      TagService.getByProject({
        projId: projectId!,
      }),
    staleTime: 1000 * 60 * 5,
  });

interface UseProjectTagsQueryParams<T> {
  select?: (data: TagRead[]) => T;
  enabled?: boolean;
}

const useProjectTagsQuery = <T = TagRead[]>({ select, enabled }: UseProjectTagsQueryParams<T>) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...projectTagsQueryOptions(projectId),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const useGetTag = (tagId: number | null | undefined) =>
  useProjectTagsQuery({
    select: (data) => data.find((tag) => tag.id === tagId)!,
    enabled: !!tagId,
  });

const useGetAllTags = () => useProjectTagsQuery({});

const useGetAllTagIdsBySdocId = (sdocId: number | null | undefined) =>
  useQuery<number[], Error>({
    queryKey: [QueryKey.SDOC_TAGS, sdocId],
    queryFn: () =>
      TagService.getBySdoc({
        sdocId: sdocId!,
      }),
    staleTime: 1000 * 60 * 5,
    enabled: !!sdocId,
  });

const useGetTagDocumentCounts = (projectId: number, sdocIds: number[]) =>
  useQuery<Map<number, number>, Error>({
    queryKey: [QueryKey.TAG_SDOC_COUNT, projectId, sdocIds],
    queryFn: async () => {
      const stringRecord = await TagService.getSdocCounts({ projectId, requestBody: sdocIds });
      return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
    },
  });

// TAG MUTATIONS

const useCreateTag = () =>
  useMutation({
    mutationFn: TagService.createDocTag,
    onSuccess: (tag) => {
      queryClient.setQueryData<TagRead[]>([QueryKey.PROJECT_TAGS, tag.project_id], (oldData) =>
        oldData ? [...oldData, tag] : [tag],
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (tag: TagRead) => `Created tag ${tag.name}`,
    },
  });

const useUpdateTag = () =>
  useMutation({
    mutationFn: TagService.updateById,
    onSuccess: (tag) => {
      queryClient.setQueryData<TagRead[]>([QueryKey.PROJECT_TAGS, tag.project_id], (oldData) =>
        oldData ? oldData.map((t) => (t.id === tag.id ? tag : t)) : oldData,
      );
    },
    meta: {
      successMessage: (tag: TagRead) => `Updated tag ${tag.name}`,
    },
  });

const useDeleteTag = () =>
  useMutation({
    mutationFn: TagService.deleteById,
    onSuccess: (data) => {
      queryClient
        .getQueryCache()
        .findAll({ queryKey: [QueryKey.SDOC_TAGS] })
        .forEach((query) => {
          queryClient.setQueryData<number[]>(query.queryKey, (oldData) =>
            oldData ? oldData.filter((tagId) => tagId !== data.id) : oldData,
          );
        });
      queryClient.setQueryData<TagRead[]>([QueryKey.PROJECT_TAGS, data.project_id], (oldData) =>
        oldData ? oldData.filter((tag) => tag.id !== data.id) : oldData,
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (tag: TagRead) => `Deleted tag ${tag.name}`,
    },
  });

const useBulkSetTags = () =>
  useMutation({
    mutationFn: TagService.setTagsBatch,
    onSuccess: (data) => {
      // write the authoritative resulting tags for every updated document
      Object.entries(data.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, Number(sdocId)], tagIds);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkLinkTags = () =>
  useMutation({
    mutationFn: TagService.linkMultipleTags,
    onSuccess: (data) => {
      // write the authoritative resulting tags for every updated document
      Object.entries(data.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, Number(sdocId)], tagIds);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUnlinkTags = () =>
  useMutation({
    mutationFn: TagService.unlinkMultipleTags,
    onSuccess: (data) => {
      // write the authoritative resulting tags for every updated document
      Object.entries(data.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, Number(sdocId)], tagIds);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUpdateTags = () =>
  useMutation({
    mutationFn: TagService.updateTagsBatch,
    onSuccess: (data) => {
      // write the authoritative resulting tags for every updated document
      Object.entries(data.links).forEach(([sdocId, tagIds]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, Number(sdocId)], tagIds);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useCountBySdocsAndUser = () =>
  useMutation({
    mutationFn: TagService.countTags,
  });

export const TagHooks = {
  useGetAllTags,
  useGetAllTagIdsBySdocId,
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkSetTags,
  useBulkUpdateTags,
  useBulkLinkTags,
  useBulkUnlinkTags,
  useGetTagDocumentCounts,
  useCountBySdocsAndUser,
};
