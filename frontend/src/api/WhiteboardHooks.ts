import { useMutation, useQuery } from "@tanstack/react-query";
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

const useGetUserWhiteboards = (projectId: number | null | undefined, userId: number | null | undefined) =>
  useQuery<Whiteboard[], Error>({
    queryKey: [QueryKey.WHITEBOARDS_PROJECT_USER, projectId, userId],
    queryFn: async () => {
      const data = await WhiteboardService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
      return data.map((whiteboard) => {
        const content = JSON.parse(whiteboard.content) as WhiteboardGraph;
        return { ...whiteboard, content };
      });
    },
    retry: false,
    enabled: !!projectId && !!userId,
  });

const useCreateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id] });
    },
  });

const useUpdateWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.updateById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id] });
    },
  });

const useDeleteWhiteboard = () =>
  useMutation({
    mutationFn: WhiteboardService.deleteById,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARD, data.id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT, data.project_id] });
      queryClient.invalidateQueries({ queryKey: [QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id] });
    },
  });

const WhiteboardHooks = {
  useGetWhiteboard,
  useGetProjectWhiteboards,
  useGetUserWhiteboards,
  useCreateWhiteboard,
  useUpdateWhiteboard,
  useDeleteWhiteboard,
};

export default WhiteboardHooks;
