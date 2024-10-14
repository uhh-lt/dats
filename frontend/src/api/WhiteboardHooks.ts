import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Edge, Node } from "reactflow";
import queryClient from "../plugins/ReactQueryClient.ts";
import { QueryKey } from "./QueryKey.ts";
import { WhiteboardRead } from "./openapi/models/WhiteboardRead.ts";
import { WhiteboardService } from "./openapi/services/WhiteboardService.ts";

export type WhiteboardGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type Whiteboard = Omit<WhiteboardRead, "content"> & { content: WhiteboardGraph };

const useGetWhiteboard = (whiteboardId: number | null | undefined) =>
  useQuery<Whiteboard, Error>({
    queryKey: [QueryKey.WHITEBOARD, whiteboardId],
    queryFn: async () => {
      const data = await WhiteboardService.getById({ whiteboardId: whiteboardId! });
      const content = JSON.parse(data.content) as WhiteboardGraph;
      return { ...data, content };
    },
    retry: false,
    enabled: !!whiteboardId,
    select: (data) => data,
  });

const useGetProjectWhiteboards = (projectId: number | null | undefined) =>
  useQuery<Whiteboard[], Error>({
    queryKey: [QueryKey.WHITEBOARDS_PROJECT, projectId],
    queryFn: async () => {
      const data = await WhiteboardService.getByProject({ projectId: projectId! });
      return data.map((whiteboard) => {
        const content = JSON.parse(whiteboard.content) as WhiteboardGraph;
        return { ...whiteboard, content };
      });
    },
    retry: false,
    enabled: !!projectId,
  });

const useCreateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.create,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData<Whiteboard[]>([QueryKey.WHITEBOARDS_PROJECT, data.project_id], (prevWhiteboards) => {
          const newWhiteboard = { ...data, content: { nodes: [], edges: [] } };
          if (!prevWhiteboards) return [newWhiteboard];
          return [...prevWhiteboards, newWhiteboard];
        });
        queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, data.id] });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, variables.requestBody.project_id] });
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData<Whiteboard[]>([QueryKey.WHITEBOARDS_PROJECT, data.project_id], (prevWhiteboards) => {
          const updatedWhiteboard = { ...data, content: JSON.parse(data.content) as WhiteboardGraph };
          if (!prevWhiteboards) return [updatedWhiteboard];
          const index = prevWhiteboards.findIndex((whiteboard) => whiteboard.id === data.id);
          if (index === -1) {
            return prevWhiteboards;
          }
          return [...prevWhiteboards.slice(0, index), updatedWhiteboard, ...prevWhiteboards.slice(index + 1)];
        });
        queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, data.project_id] });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, variables.whiteboardId] });
    },
  });

const useDuplicateWhiteboard = () => {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  return useMutation({
    mutationFn: WhiteboardService.duplicateById,
    onSettled(data) {
      if (data) {
        queryClient.setQueryData<Whiteboard[]>([QueryKey.WHITEBOARDS_PROJECT, projectId], (prevWhiteboards) => {
          const duplicatedWhiteboard = { ...data, content: JSON.parse(data.content) as WhiteboardGraph };
          if (!prevWhiteboards) return [duplicatedWhiteboard];
          return [...prevWhiteboards, duplicatedWhiteboard];
        });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, projectId] });
    },
  });
};

const useDeleteWhiteboard = () => {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  return useMutation({
    mutationFn: WhiteboardService.deleteById,
    onSettled(data, _error, variables) {
      if (data) {
        queryClient.setQueryData<Whiteboard[]>([QueryKey.WHITEBOARDS_PROJECT, projectId], (prevWhiteboards) => {
          if (!prevWhiteboards) return [];
          return prevWhiteboards.filter((whiteboard) => whiteboard.id !== data.id);
        });
      }
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, variables.whiteboardId] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, projectId] });
    },
  });
};

const WhiteboardHooks = {
  useGetWhiteboard,
  useGetProjectWhiteboards,
  useCreateWhiteboard,
  useDuplicateWhiteboard,
  useUpdateWhiteboard,
  useDeleteWhiteboard,
};

export default WhiteboardHooks;
