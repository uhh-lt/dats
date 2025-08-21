import { useMutation, useQueries, useQuery, UseQueryResult } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { ProjectMetadataRead } from "./openapi/models/ProjectMetadataRead.ts";
import { SourceDocumentMetadataRead } from "./openapi/models/SourceDocumentMetadataRead.ts";
import { ProjectMetadataService } from "./openapi/services/ProjectMetadataService.ts";
import { SdocMetadataService } from "./openapi/services/SdocMetadataService.ts";

// PROJECT METADATA QUERIES

export type ProjectMetadataMap = Record<number, ProjectMetadataRead>;

interface UseProjectMetaadataQueryParams<T> {
  select?: (data: ProjectMetadataMap) => T;
  enabled?: boolean;
}

const useProjectMetadataQuery = <T = ProjectMetadataMap>({ select, enabled }: UseProjectMetaadataQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_METADATAS, projectId],
    queryFn: async () => {
      const metadata = await ProjectMetadataService.getByProject({
        projId: projectId!,
      });
      return metadata.reduce((acc, metadata) => {
        acc[metadata.id] = metadata;
        return acc;
      }, {} as ProjectMetadataMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetProjectMetadata = (metadataId: number | null | undefined) =>
  useProjectMetadataQuery({
    select: (data) => data[metadataId!],
    enabled: !!metadataId,
  });

const useGetProjectMetadataList = () => useProjectMetadataQuery({ select: (data) => Object.values(data) });

// PROJECT METADATA MUTATIONS
const useCreateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.createNewMetadata,
    onSuccess: (data) => {
      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, data.project_id], (old) =>
        old ? { ...old, [data.id]: data } : { [data.id]: data },
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_METADATAS] }); // sdoc metadata queries need to be refetched, as there is new metadata now!
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] }); // tableInfo queries need to be refetched, as there is new metadata now!
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Added metadata to Project ${data.project_id}`,
      errorMessage: (error: { status: number }) =>
        error.status === 409 ? "Key already exists" : "Could not add metadata",
    },
  });

const useUpdateProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.updateById,
    onSuccess: (metadata) => {
      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, metadata.project_id], (old) =>
        old ? { ...old, [metadata.id]: metadata } : { [metadata.id]: metadata },
      );
    },
    meta: {
      successMessage: (projectMetadata: ProjectMetadataRead) =>
        `Updated projectMetadata ${projectMetadata.id} for project ${projectMetadata.project_id}`,
    },
  });

const useDeleteProjectMetadata = () =>
  useMutation({
    mutationFn: ProjectMetadataService.deleteById,
    onSuccess: (data) => {
      queryClient
        .getQueryCache()
        .findAll({ queryKey: [QueryKey.SDOC_METADATAS] })
        .forEach((query) => {
          queryClient.setQueryData<SdocMetadataMap>(query.queryKey, (oldData) => {
            const newData = { ...oldData };
            delete newData[data.id];
            return newData;
          });
        });

      queryClient.setQueryData<ProjectMetadataMap>([QueryKey.PROJECT_METADATAS, data.project_id], (old) => {
        const newData = { ...old };
        delete newData[data.id];
        return newData;
      });

      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE_INFO] }); // tableInfo queries need to be refetched, as metadata was deleted
    },
    meta: {
      successMessage: (data: ProjectMetadataRead) => `Deleted metadata "${data.key}"`,
    },
  });

// SDOC METADATA QUERIES
// mapping from projectMetadataId -> SourceDocumentRead
export type SdocMetadataMap = Record<number, SourceDocumentMetadataRead>;

interface UseSdocMetadataQueryParams<T> {
  sdocId: number | undefined | null;
  select?: (data: SdocMetadataMap) => T;
}

const sdocMetadataQueryFn = async (sdocId: number) => {
  const metadata = await SdocMetadataService.getBySdoc({
    sdocId: sdocId!,
  });
  return metadata.reduce((acc, metadata) => {
    acc[metadata.project_metadata_id] = metadata;
    return acc;
  }, {} as SdocMetadataMap);
};

const useSdocMetadataQuery = <T = SdocMetadataMap>({ sdocId, select }: UseSdocMetadataQueryParams<T>) =>
  useQuery({
    queryKey: [QueryKey.SDOC_METADATAS, sdocId],
    queryFn: () => sdocMetadataQueryFn(sdocId!),
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!sdocId,
  });

const useGetSdocMetadata = (sdocId: number | null | undefined) =>
  useSdocMetadataQuery({
    sdocId,
    select: (data) => Object.values(data),
  });

const useGetSdocMetadataByProjectMetadataId = (sdocId: number | null | undefined, projectMetadataId: number) =>
  useSdocMetadataQuery({
    sdocId,
    select: (data) => data[projectMetadataId],
  });

export type SourceDocumentMetadataReadCombined = Omit<SourceDocumentMetadataRead, "id" | "source_document_id"> & {
  ids: number[];
};

// referential stability for bulk queries
const combineBulkData = (results: UseQueryResult<SdocMetadataMap, Error>[]) => {
  const isSuccess = results.every((result) => result.isSuccess);

  let data: SourceDocumentMetadataReadCombined[] | undefined = undefined;
  if (isSuccess) {
    // Aggregate all SourceDocumentMetadataRead objects by project_metadata_id
    const combinedMap: Record<number, SourceDocumentMetadataRead[]> = {};
    results.forEach((result) => {
      Object.entries(result.data).forEach(([projectMetadataId, metadata]) => {
        const pmid = Number(projectMetadataId);
        if (!combinedMap[pmid]) {
          combinedMap[pmid] = [metadata];
        } else {
          combinedMap[pmid].push(metadata);
        }
      });
    });

    // Merge values for each project_metadata_id
    data = Object.entries(combinedMap).map(([projectMetadataId, metadatas]) => {
      // Helper to merge a field
      function mergeField<T>(getter: (m: SourceDocumentMetadataRead) => T): T | null {
        const values = metadatas.map(getter);
        const first = values[0];
        return values.every((v) => v === first) ? first : null;
      }

      return {
        int_value: mergeField((m) => m.int_value),
        str_value: mergeField((m) => m.str_value),
        boolean_value: mergeField((m) => m.boolean_value),
        date_value: mergeField((m) => m.date_value),
        list_value:
          mergeField((m) => JSON.stringify(m.list_value)) === JSON.stringify(metadatas[0].list_value)
            ? metadatas[0].list_value
            : null,
        ids: metadatas.map((m) => m.id),
        project_metadata_id: Number(projectMetadataId),
      };
    });
  }

  return {
    isLoading: results.some((result) => result.isLoading),
    isError: results.some((result) => result.isError),
    isSuccess,
    data,
  };
};

const useGetSdocMetadataBulk = (sdocIds: number[]) =>
  useQueries({
    queries: sdocIds.map((sdocId) => ({
      queryKey: [QueryKey.SDOC_METADATAS, sdocId],
      queryFn: () => sdocMetadataQueryFn(sdocId),
      staleTime: 1000 * 60 * 5,
    })),
    combine: combineBulkData,
  });

// TODO: REMOVE THIS HOOK
const useGetSdocMetadataByKey = (sdocId: number | null | undefined, key: string) =>
  useQuery<SourceDocumentMetadataRead, Error>({
    queryKey: [QueryKey.SDOC_METADATA_BY_KEY, sdocId, key],
    queryFn: () =>
      SdocMetadataService.getBySdocAndKey({
        sdocId: sdocId!,
        metadataKey: key,
      }),
    enabled: !!sdocId,
  });

// SDOC METADATA MUTATIONS

const useUpdateBulkSdocMetadata = () =>
  useMutation({
    mutationFn: SdocMetadataService.updateBulk,
    onSuccess: (metadatas) => {
      metadatas.forEach((metadata) => {
        queryClient.setQueryData<SdocMetadataMap>([QueryKey.SDOC_METADATAS, metadata.source_document_id], (old) =>
          old ? { ...old, [metadata.project_metadata_id]: metadata } : { [metadata.project_metadata_id]: metadata },
        );
      });
    },
    meta: {
      successMessage: (data: SourceDocumentMetadataRead[]) => `Updated ${data.length} document metadata values`,
    },
  });

const MetadataHooks = {
  // sdoc metadata
  useGetSdocMetadata,
  useGetSdocMetadataByKey,
  useGetSdocMetadataByProjectMetadataId,
  useGetSdocMetadataBulk,
  useUpdateBulkSdocMetadata,
  // project metadata
  useGetProjectMetadataList,
  useGetProjectMetadata,
  useCreateProjectMetadata,
  useUpdateProjectMetadata,
  useDeleteProjectMetadata,
};

export default MetadataHooks;
