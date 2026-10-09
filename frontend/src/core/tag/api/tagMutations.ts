import { TagService } from "@api/services/TagService";
import { SdocTagLinks } from "@models/SdocTagLinks";
import { TagRead } from "@models/TagRead";
import { useMutation } from "@tanstack/react-query";
import { tagQueries } from "./tagQueries";

// TAG MUTATIONS

export const useCreateTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "create"],
    mutationFn: TagService.createDocTag,
    meta: {
      datsEvent: "TAG_CREATED",
      successMessage: (tag: TagRead) => `Created tag ${tag.name}`,
    },
  });

export const useUpdateTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "update"],
    mutationFn: TagService.updateById,
    meta: {
      datsEvent: "TAG_UPDATED",
      successMessage: (tag: TagRead) => `Updated tag ${tag.name}`,
    },
  });

export const useDeleteTag = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "delete"],
    mutationFn: TagService.deleteById,
    meta: {
      datsEvent: "TAG_DELETED",
      successMessage: (tag: TagRead) => `Deleted tag ${tag.name}`,
    },
  });

export const useBulkSetTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkSet"],
    mutationFn: TagService.setTagsBatch,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

export const useBulkLinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkLink"],
    mutationFn: TagService.linkMultipleTags,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

export const useBulkUnlinkTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUnlink"],
    mutationFn: TagService.unlinkMultipleTags,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

export const useBulkUpdateTags = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "bulkUpdate"],
    mutationFn: TagService.updateTagsBatch,
    meta: {
      datsEvent: "SDOC_TAGS_LINKED",
      successMessage: (data: SdocTagLinks) => `Updated tags for ${Object.keys(data.links).length} documents`,
    },
  });

export const useCountTagsBySdocsAndUser = () =>
  useMutation({
    mutationKey: [...tagQueries.all(), "count"],
    mutationFn: TagService.countTags,
  });
