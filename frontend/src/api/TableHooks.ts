import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { AnalysisTableRead } from "./openapi/models/AnalysisTableRead.ts";
import { AnalysisTableService } from "./openapi/services/AnalysisTableService.ts";

export type TablePage = {
  id: string;
  name: string;
  content: string[][];
};

export type TableRead = Omit<AnalysisTableRead, "content"> & { content: TablePage[] };

const useGetTable = (tableId: number | null | undefined) =>
  useQuery<TableRead, Error>({
    queryKey: [QueryKey.TABLE, tableId],
    queryFn: async () => {
      const data = await AnalysisTableService.getById({ analysisTableId: tableId! });
      const content = JSON.parse(data.content) as TablePage[];
      return { ...data, content };
    },
    retry: false,
    enabled: !!tableId,
    select: (data) => data,
  });

const useGetUserTables = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<TableRead[], Error>({
    queryKey: [QueryKey.TABLES_PROJECT_USER, projectId, userId],
    queryFn: async () => {
      const data = await AnalysisTableService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
      return data.map((table) => {
        const content = JSON.parse(table.content) as TablePage[];
        return { ...table, content };
      });
    },
    retry: false,
    enabled: !!projectId && !!userId,
  });

const useCreateTable = () =>
  useMutation({
    mutationFn: AnalysisTableService.create,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData(
          [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id],
          (prevTables: TableRead[]) =>
            [
              ...prevTables,
              {
                ...data,
                content: [],
              },
            ] as TableRead[],
        );
        queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE, data.id] });
      }
      queryClient.invalidateQueries({
        queryKey: [QueryKey.TABLES_PROJECT_USER, variables.requestBody.project_id, variables.requestBody.user_id],
      });
    },
  });

const useUpdateTable = () =>
  useMutation({
    mutationFn: AnalysisTableService.updateById,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData(
          [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id],
          (prevTables: TableRead[]) => {
            const index = prevTables.findIndex((table) => table.id === data.id);
            if (index === -1) {
              return prevTables;
            }
            return [...prevTables.slice(0, index), data, ...prevTables.slice(index + 1)];
          },
        );
        queryClient.invalidateQueries({ queryKey: [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id] });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE, variables.analysisTableId] });
    },
  });

const useDuplicateTable = () =>
  useMutation({
    mutationFn: AnalysisTableService.duplicateById,
    onSuccess(data) {
      queryClient.setQueryData(
        [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id],
        (prevTables: TableRead[]) => [...prevTables, data],
      );
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id] });
    },
  });

const useDeleteTable = () =>
  useMutation({
    mutationFn: AnalysisTableService.deleteById,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData(
          [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id],
          (prevTables: TableRead[]) => prevTables.filter((table) => table.id !== data.id),
        );
        queryClient.invalidateQueries({ queryKey: [QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id] });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.TABLE, variables.analysisTableId] });
    },
  });

const TableHooks = {
  useGetTable,
  useGetUserTables,
  useCreateTable,
  useUpdateTable,
  useDuplicateTable,
  useDeleteTable,
};

export default TableHooks;
