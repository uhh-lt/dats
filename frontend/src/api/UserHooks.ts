import { useMutation, useQuery } from "@tanstack/react-query";
import { CodeRead, MemoRead, ProjectRead, UserRead, UserService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";
import { useSelectEnabledCodes } from "./utils";

// project
const useGetProjects = (userId: number | undefined) =>
  useQuery<ProjectRead[], Error>(
    [QueryKey.USER_PROJECTS, userId],
    () => UserService.getUserProjects({ userId: userId! }),
    {
      enabled: !!userId,
    }
  );

// user
const useGetUser = (userId: number | undefined) =>
  useQuery<UserRead, Error>([QueryKey.USER, userId], () => UserService.getById({ userId: userId! }), {
    enabled: !!userId,
  });

const useRegister = () =>
  useMutation(UserService.register, {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USERS]);
    },
  });

const useGetAll = () => useQuery<UserRead[], Error>([QueryKey.USERS], () => UserService.getAll({}));

// codes
const useGetAllCodes = (userId: number) => {
  const selectEnabledCodes = useSelectEnabledCodes();
  return useQuery<CodeRead[], Error>([QueryKey.USER_CODES, userId], () => UserService.getUserCodes({ userId }), {
    select: selectEnabledCodes,
  });
};

// memo
const useGetAllMemos = (userId: number) =>
  useQuery<MemoRead[], Error>([QueryKey.USER_MEMOS, userId], () => UserService.getUserMemos({ userId }));

const UserHooks = {
  useGetProjects,
  useGetUser,
  useGetAll,
  useRegister,
  useGetAllCodes,
  useGetAllMemos,
};

export default UserHooks;
