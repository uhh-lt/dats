import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import { useAppSelector } from "../plugins/ReduxHooks.ts";
import { RootState } from "../store/store.ts";
import { QueryKey } from "./QueryKey.ts";
import { WhiteboardRead } from "./openapi/models/WhiteboardRead.ts";
import { WhiteboardService } from "./openapi/services/WhiteboardService.ts";

// WHITEBOARD QUERIES

export type WhiteboardMap = Record<number, WhiteboardRead>;

interface UseProjectWhiteboardsQueryParams<T> {
  select?: (data: WhiteboardMap) => T;
  enabled?: boolean;
}

const useProjectWhiteboardsQuery = <T = WhiteboardMap>({ select, enabled }: UseProjectWhiteboardsQueryParams<T>) => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useQuery({
    queryKey: [QueryKey.PROJECT_WHITEBOARDS, projectId],
    queryFn: async () => {
      const data = await WhiteboardService.getByProject({ projectId: projectId! });
      return data.reduce((acc, whiteboard) => {
        const content = whiteboard.content;
        acc[whiteboard.id] = { ...whiteboard, content };
        return acc;
      }, {} as WhiteboardMap);
    },
    staleTime: 1000 * 60 * 5,
    select,
    enabled: !!projectId && enabled,
  });
};

const useGetWhiteboard = (whiteboardId: number | null | undefined) =>
  useProjectWhiteboardsQuery({
    select: (data) => data[whiteboardId!],
    enabled: !!whiteboardId,
  });

const useGetProjectWhiteboardsList = () => useProjectWhiteboardsQuery({ select: (data) => Object.values(data) });

// WHITEBOARD MUTATIONS
const useCreateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.create,
    onSuccess(data) {
      const newWhiteboard = { ...data, content: { nodes: [], edges: [] } };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, data.project_id], (prevWhiteboards) => {
        return prevWhiteboards ? { ...prevWhiteboards, [data.id]: newWhiteboard } : { [data.id]: newWhiteboard };
      });
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Created Whiteboard "${whiteboard.title}"`,
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    onSuccess(data) {
      const updatedWhiteboard = { ...data };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, data.project_id], (prevWhiteboards) => {
        return prevWhiteboards
          ? { ...prevWhiteboards, [data.id]: updatedWhiteboard }
          : { [data.id]: updatedWhiteboard };
      });
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Updated Whiteboard "${whiteboard.title}"`,
    },
  });

const useDuplicateWhiteboard = () => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useMutation({
    mutationFn: WhiteboardService.duplicateById,
    onSuccess(data) {
      const duplicatedWhiteboard = { ...data };
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, projectId], (prevWhiteboards) =>
        prevWhiteboards ? { ...prevWhiteboards, [data.id]: duplicatedWhiteboard } : { [data.id]: duplicatedWhiteboard },
      );
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Duplicated Whiteboard "${whiteboard.title}"`,
    },
  });
};

const useDeleteWhiteboard = () => {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);
  return useMutation({
    mutationFn: WhiteboardService.deleteById,
    onSuccess(data) {
      queryClient.setQueryData<WhiteboardMap>([QueryKey.PROJECT_WHITEBOARDS, projectId], (prevWhiteboards) => {
        if (!prevWhiteboards) return prevWhiteboards;
        const newData = { ...prevWhiteboards };
        delete newData[data.id];
        return newData;
      });
    },
    meta: {
      successMessage: (whiteboard: WhiteboardRead) => `Deleted Whiteboard "${whiteboard.title}"`,
    },
  });
};

const WhiteboardHooks = {
  useGetProjectWhiteboardsList,
  useGetWhiteboard,
  useCreateWhiteboard,
  useDuplicateWhiteboard,
  useUpdateWhiteboard,
  useDeleteWhiteboard,
};

export default WhiteboardHooks;
