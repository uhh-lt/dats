import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import { AnalysisTableRead, AnalysisTableService } from "./openapi";

export type TablePage = {
  id: string;
  name: string;
  content: string[][];
};

export type TableRead = Omit<AnalysisTableRead, "content"> & { content: TablePage[] };

const useGetTable = (tableId: number | null | undefined) =>
  useQuery<TableRead, Error>(
    [QueryKey.TABLE, tableId],
    async () => {
      const data = await AnalysisTableService.getById({ analysisTableId: tableId! });
      const content = JSON.parse(data.content) as TablePage[];
      return { ...data, content };
    },
    {
      retry: false,
      enabled: !!tableId,
      select: (data) => data,
    },
  );

const useGetUserTables = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<TableRead[], Error>(
    [QueryKey.TABLES_PROJECT_USER, projectId, userId],
    async () => {
      const data = await AnalysisTableService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
      return data.map((table) => {
        const content = JSON.parse(table.content) as TablePage[];
        return { ...table, content };
      });
    },
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useCreateTable = () =>
  useMutation(AnalysisTableService.create, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TABLE, data.id]);
      queryClient.invalidateQueries([QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useUpdateTable = () =>
  useMutation(AnalysisTableService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TABLE, data.id]);
      queryClient.invalidateQueries([QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useDeleteTable = () =>
  useMutation(AnalysisTableService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.TABLE, data.id]);
      queryClient.invalidateQueries([QueryKey.TABLES_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const TableHooks = {
  useGetTable,
  useGetUserTables,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
};

export default TableHooks;
