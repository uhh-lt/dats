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
    mutationFn: TagService.createTag,
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

const useUpdateBulkTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "updateBulkTag"],
    mutationFn: TagService.updateTagsBulk,
    meta: {
      datsEvent: "TAG_UPDATED_BATCH",
      successMessage: (tags: TagRead[]) => `Updated ${tags.length} tag(s)`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "A tag name is already taken" : "Could not update the tags",
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
    mutationFn: TagService.setSdocTagsBulk,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkLinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkLinkTags"],
    mutationFn: TagService.linkTagsBulk,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUnlinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUnlinkTags"],
    mutationFn: TagService.unlinkTagsBulk,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useBulkUpdateTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUpdateTags"],
    mutationFn: TagService.updateSdocTagsBulk,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

const useCountTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "countTags"],
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
  useUpdateBulkTag,
  useDeleteTag,
  useBulkSetTags,
  useBulkLinkTags,
  useBulkUnlinkTags,
  useBulkUpdateTags,
  useCountTags,
  useGetAllTags,
  useGetAllTagsMap,
};
