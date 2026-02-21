import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { Body_tag_update_tags_batch } from "./openapi/models/Body_tag_update_tags_batch.ts";
import { SourceDocumentTagMultiLink } from "./openapi/models/SourceDocumentTagMultiLink.ts";
import { TagRead } from "./openapi/models/TagRead.ts";
import { TagService } from "./openapi/services/TagService.ts";

// TAG QUERIES
interface UseProjectTagsQueryParams<T> {
  select?: (data: TagRead[]) => T;
  enabled?: boolean;
}

const useProjectTagsQuery = <T = TagRead[]>({ select, enabled }: UseProjectTagsQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () =>
      TagService.getByProject({
        projId: projectId!,
      }),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
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
    mutationFn: TagService.createNewDocTag,
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
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.forEach((links) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, links.source_document_id], () => links.tag_ids);
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (data: number) => `Updated tags for ${data} documents`,
    },
  });

const useBulkLinkTags = () =>
  useMutation({
    mutationFn: TagService.linkMultipleTags,
    onSuccess: (_data, variables) => {
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, sdocId], (oldData) =>
          oldData ? [...new Set([...oldData, ...variables.requestBody.tag_ids])] : variables.requestBody.tag_ids,
        );
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (
        _data: number,
        variables: {
          requestBody: SourceDocumentTagMultiLink;
        },
      ) =>
        `Linked ${variables.requestBody.tag_ids.length} tags to ${variables.requestBody.source_document_ids.length} documents`,
    },
  });

const useBulkUnlinkTags = () =>
  useMutation({
    mutationFn: TagService.unlinkMultipleTags,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, sdocId], (oldData) =>
          oldData ? oldData.filter((tagId) => !variables.requestBody.tag_ids.includes(tagId)) : oldData,
        );
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (
        _data: number,
        variables: {
          requestBody: SourceDocumentTagMultiLink;
        },
      ) =>
        `Unlinked ${variables.requestBody.tag_ids.length} tags from ${variables.requestBody.source_document_ids.length} documents`,
    },
  });

const useBulkUpdateTags = () =>
  useMutation({
    mutationFn: TagService.updateTagsBatch,
    onSuccess: (_data, variables) => {
      variables.requestBody.sdoc_ids.forEach((sdocId) => {
        // Update the cache with linked and unlinked tags
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, sdocId], (oldData) => {
          let newData = oldData ? [...oldData] : [];
          // Add linked tags
          if (variables.requestBody.link_tag_ids) {
            newData = [...new Set([...newData, ...variables.requestBody.link_tag_ids])];
          }
          // Remove unlinked tags
          if (variables.requestBody.unlink_tag_ids) {
            newData = newData.filter((tagId) => !variables.requestBody.unlink_tag_ids.includes(tagId));
          }
          return newData;
        });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
    meta: {
      successMessage: (
        _data: number,
        variables: {
          requestBody: Body_tag_update_tags_batch;
        },
      ) => {
        const linkCount = variables.requestBody.link_tag_ids?.length || 0;
        const unlinkCount = variables.requestBody.unlink_tag_ids?.length || 0;
        return `Updated tags (${linkCount} linked, ${unlinkCount} unlinked) for ${variables.requestBody.sdoc_ids.length} documents`;
      },
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
