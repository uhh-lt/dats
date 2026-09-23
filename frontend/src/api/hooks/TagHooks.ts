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
    meta: {
      entityEvent: "TAG_CREATED",
      successMessage: (tag: TagRead) => `Created tag ${tag.name}`,
    },
  });

const useUpdateTag = () =>
  useMutation({
    mutationFn: TagService.updateById,
    meta: {
      entityEvent: "TAG_UPDATED",
      successMessage: (tag: TagRead) => `Updated tag ${tag.name}`,
    },
  });

const useDeleteTag = () =>
  useMutation({
    mutationFn: TagService.deleteById,
    meta: {
      entityEvent: "TAG_DELETED",
      successMessage: (tag: TagRead) => `Deleted tag ${tag.name}`,
    },
  });

const useBulkSetTags = () =>
  useMutation({
    mutationFn: TagService.setTagsBatch,
    meta: {
      entityEvent: "SDOC_TAGS_UPDATED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkLinkTags = () =>
  useMutation({
    mutationFn: TagService.linkMultipleTags,
    meta: {
      entityEvent: "SDOC_TAGS_UPDATED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUnlinkTags = () =>
  useMutation({
    mutationFn: TagService.unlinkMultipleTags,
    meta: {
      entityEvent: "SDOC_TAGS_UPDATED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUpdateTags = () =>
  useMutation({
    mutationFn: TagService.updateTagsBatch,
    meta: {
      entityEvent: "SDOC_TAGS_UPDATED",
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
