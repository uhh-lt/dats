import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { DocumentTagRead } from "./openapi/models/DocumentTagRead.ts";
import { MemoRead } from "./openapi/models/MemoRead.ts";
import { DocumentTagService } from "./openapi/services/DocumentTagService.ts";
import { ProjectService } from "./openapi/services/ProjectService.ts";

// tags
interface UseProjectTagsQueryParams<T> {
  select?: (data: DocumentTagRead[]) => T;
  enabled?: boolean;
}

const useProjectTagsQuery = <T = DocumentTagRead[]>({ select, enabled }: UseProjectTagsQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_TAGS, projectId],
    queryFn: () =>
      ProjectService.getProjectTags({
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

const useCreateTag = () =>
  useMutation({
    mutationFn: DocumentTagService.createNewDocTag,
    onSuccess: (tag) => {
      queryClient.setQueryData<DocumentTagRead[]>([QueryKey.PROJECT_TAGS, tag.project_id], (oldData) =>
        oldData ? [...oldData, tag] : [tag],
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useUpdateTag = () =>
  useMutation({
    mutationFn: DocumentTagService.updateById,
    onSuccess: (tag) => {
      queryClient.setQueryData<DocumentTagRead[]>([QueryKey.PROJECT_TAGS, tag.project_id], (oldData) =>
        oldData ? oldData.map((t) => (t.id === tag.id ? tag : t)) : oldData,
      );
    },
  });

const useDeleteTag = () =>
  useMutation({
    mutationFn: DocumentTagService.deleteById,
    onSuccess: (data) => {
      queryClient.setQueryData<DocumentTagRead[]>([QueryKey.PROJECT_TAGS, data.project_id], (oldData) =>
        oldData ? oldData.filter((tag) => tag.id !== data.id) : oldData,
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS] }); // todo welche sdocs sind eigentlich genau affected?
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkSetDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.setDocumentTagsBatch,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.forEach((links) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, links.source_document_id] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] }); // todo: zu unspezifisch!
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkLinkDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.linkMultipleTags,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUnlinkDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.unlinkMultipleTags,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.source_document_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

const useBulkUpdateDocumentTags = () =>
  useMutation({
    mutationFn: DocumentTagService.updateDocumentTagsBatch,
    onSuccess: (_data, variables) => {
      // we need to invalidate the document tags for every document that we updated
      variables.requestBody.sdoc_ids.forEach((sdocId) => {
        queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_TAGS, sdocId] });
      });
      queryClient.invalidateQueries({ queryKey: [QueryKey.FILTER_TAG_STATISTICS] });
      // Invalidate cache of tag statistics query
      queryClient.invalidateQueries({ queryKey: [QueryKey.TAG_SDOC_COUNT] });
    },
  });

// memos
const useGetMemo = (tagId: number | null | undefined) =>
  useQuery<MemoRead, Error>({
    queryKey: [QueryKey.MEMO_TAG, tagId],
    queryFn: () => DocumentTagService.getUserMemo({ tagId: tagId! }),
    retry: false,
    enabled: !!tagId,
  });

const useGetTagDocumentCounts = (sdocIds: number[]) =>
  useQuery<Map<number, number>, Error>({
    queryKey: [QueryKey.TAG_SDOC_COUNT, sdocIds],
    queryFn: async () => {
      const stringRecord = await DocumentTagService.getSdocCounts({ requestBody: sdocIds });
      return new Map(Object.entries(stringRecord).map(([key, val]) => [parseInt(key, 10), val]));
    },
  });

const TagHooks = {
  useGetAllTags,
  useGetTag,
  useCreateTag,
  useUpdateTag,
  useDeleteTag,
  useBulkSetDocumentTags,
  useBulkUpdateDocumentTags,
  useBulkLinkDocumentTags,
  useBulkUnlinkDocumentTags,
  useGetTagDocumentCounts,
  //memos
  useGetMemo,
};

export default TagHooks;
