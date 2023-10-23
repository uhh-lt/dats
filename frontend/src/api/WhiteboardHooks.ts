import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { QueryKey } from "./QueryKey";
import { WhiteboardRead, WhiteboardService } from "./openapi";
import { Edge, Node } from "reactflow";

export type WhiteboardGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type Whiteboard = Omit<WhiteboardRead, "content"> & { content: WhiteboardGraph };

const useGetWhiteboard = (whiteboardId: number | undefined) =>
  useQuery<Whiteboard, Error>(
    [QueryKey.WHITEBOARD, whiteboardId],
    async () => {
      const data = await WhiteboardService.getById({ whiteboardId: whiteboardId! });
      const content = JSON.parse(data.content) as WhiteboardGraph;
      return { ...data, content };
    },
    {
      retry: false,
      enabled: !!whiteboardId,
      select: (data) => data,
    },
  );

const useGetProjectWhiteboards = (projectId: number | undefined) =>
  useQuery<Whiteboard[], Error>(
    [QueryKey.WHITEBOARDS_PROJECT, projectId],
    async () => {
      const data = await WhiteboardService.getByProject({ projectId: projectId! });
      return data.map((whiteboard) => {
        const content = JSON.parse(whiteboard.content) as WhiteboardGraph;
        return { ...whiteboard, content };
      });
    },
    {
      retry: false,
      enabled: !!projectId,
    },
  );

const useGetUserWhiteboards = (projectId: number | undefined, userId: number | undefined) =>
  useQuery<Whiteboard[], Error>(
    [QueryKey.WHITEBOARDS_PROJECT_USER, projectId, userId],
    async () => {
      const data = await WhiteboardService.getByProjectAndUser({ projectId: projectId!, userId: userId! });
      return data.map((whiteboard) => {
        const content = JSON.parse(whiteboard.content) as WhiteboardGraph;
        return { ...whiteboard, content };
      });
    },
    {
      retry: false,
      enabled: !!projectId && !!userId,
    },
  );

const useCreateWhiteboard = () =>
  useMutation(WhiteboardService.create, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.WHITEBOARD, data.id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT, data.project_id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useUpdateWhiteboard = () =>
  useMutation(WhiteboardService.updateById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.WHITEBOARD, data.id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT, data.project_id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id]);
    },
  });

const useDeleteWhiteboard = () =>
  useMutation(WhiteboardService.deleteById, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.WHITEBOARD, data.id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT, data.project_id]);
      queryClient.invalidateQueries([QueryKey.WHITEBOARDS_PROJECT_USER, data.project_id, data.user_id]);
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
