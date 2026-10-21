import { TagService } from "@api/services/TagService";
import { SdocTagLinks } from "@models/SdocTagLinks";
import { TagRead } from "@models/TagRead";
import { useAppSelector } from "@store/storeHooks";
import { useMutation, useQuery } from "@tanstack/react-query";
import { tagQueries } from "./tagQueries";

// TAG QUERIES
// The queries themselves (key + queryFn) live in tagQueries. The hook below only derives data from them.

const useGetTag = (tagId: number | null | undefined) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...tagQueries.byProject(projectId),
    select: (data) => data.find((tag) => tag.id === tagId)!,
    enabled: !!tagId,
  });
};

// TAG MUTATIONS

const useCreateTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "createTag"],
    mutationFn: TagService.createDocTag,
    meta: {
      datsEvent: "TAG_CREATED",
      successMessage: (tag: TagRead) => `Created tag ${tag.name}`,
    },
  });

const useUpdateTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "updateTag"],
    mutationFn: TagService.updateById,
    meta: {
      datsEvent: "TAG_UPDATED",
      successMessage: (tag: TagRead) => `Updated tag ${tag.name}`,
    },
  });

const useDeleteTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "deleteTag"],
    mutationFn: TagService.deleteById,
    meta: {
      datsEvent: "TAG_DELETED",
      successMessage: (tag: TagRead) => `Deleted tag ${tag.name}`,
    },
  });

const useBulkSetTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkSetTags"],
    mutationFn: TagService.setTagsBatch,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkLinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkLinkTags"],
    mutationFn: TagService.linkMultipleTags,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUnlinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUnlinkTags"],
    mutationFn: TagService.unlinkMultipleTags,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUpdateTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUpdateTags"],
    mutationFn: TagService.updateTagsBatch,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useCountBySdocsAndUser = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "countBySdocsAndUser"],
    mutationFn: TagService.countTags,
  });

interface UseProjectTagsQueryParams<T> {
  select?: (data: TagRead[]) => T;
  enabled?: boolean;
}

const useGetAllTags = <T = TagRead[]>({ select, enabled }: UseProjectTagsQueryParams<T> = {}) => {
  const projectId = useAppSelector((state) => state.project.projectId);
  return useQuery({
    ...tagQueries.byProject(projectId),
    select,
    enabled: !!projectId && (enabled ?? true),
  });
};

const selectTagsMap = (tags: TagRead[]) =>
  tags.reduce<Record<number, TagRead>>((acc, tag) => {
    acc[tag.id] = tag;
    return acc;
  }, {});

const useGetAllTagsMap = () => useGetAllTags({ select: selectTagsMap });

export const TagHooks = {
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkSetTags,
  useBulkLinkTags,
  useBulkUnlinkTags,
  useBulkUpdateTags,
  useCountBySdocsAndUser,
  useGetAllTags,
  useGetAllTagsMap,
};
