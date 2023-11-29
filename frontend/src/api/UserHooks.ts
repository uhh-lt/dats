import { useMutation, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient";
import { AnnotationDocumentRead, AuthenticationService, ProjectRead, PublicUserRead, UserService } from "./openapi";
import { QueryKey } from "./QueryKey";

// project
const useGetProjects = (userId: number | null | undefined) =>
  useQuery<ProjectRead[], Error>(
    [QueryKey.USER_PROJECTS, userId],
    () => UserService.getUserProjects({ userId: userId! }),
    {
      enabled: !!userId,
    }
  );

const useGetUser = (userId: number | null | undefined) =>
  useQuery<PublicUserRead, Error>([QueryKey.USER, userId], () => UserService.getById({ userId: userId! }), {
    enabled: !!userId,
  });

const useRegister = () =>
  useMutation(AuthenticationService.register, {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USERS]);
    },
  });

const useGetAll = () => useQuery<PublicUserRead[], Error>([QueryKey.USERS], () => UserService.getAll({}));

const useGetRecentActivity = (userId: number | null | undefined, k: number) => {
  return useQuery<AnnotationDocumentRead[], Error>(
    [QueryKey.USER_ACTIVITY, userId],
    () => UserService.recentActivity({ userId: userId!, k: k }),
    {
      enabled: !!userId,
    }
  );
};

const useUpdate = () =>
  useMutation(UserService.updateById, {
    onSuccess: (user) => {
      queryClient.invalidateQueries([QueryKey.USERS]);
      queryClient.invalidateQueries([QueryKey.USER, user.id]);
    },
  });

const UserHooks = {
  useGetProjects,
  useGetUser,
  useGetAll,
  useRegister,
  useGetRecentActivity,
  useUpdate,
};

export default UserHooks;
