import { useMutation, useQuery } from "@tanstack/react-query";
import { CodeRead, MemoRead, ProjectRead, UserRead, UserService } from "./openapi";
import { QueryKey } from "./QueryKey";
import queryClient from "../plugins/ReactQueryClient";

// project
const useGetProjects = (userId: number | undefined) =>
  useQuery<ProjectRead[], Error>(
    [QueryKey.USER_PROJECTS, userId],
    () => UserService.getUserProjectsUserUserIdProjectGet({ userId: userId! }),
    {
      enabled: !!userId,
    }
  );

// user
const useGetUser = (userId: number | undefined) =>
  useQuery<UserRead, Error>([QueryKey.USER, userId], () => UserService.getByIdUserUserIdGet({ userId: userId! }), {
    enabled: !!userId,
  });

const useRegister = () =>
  useMutation(UserService.registerUserPut, {
    onSuccess: () => {
      queryClient.invalidateQueries([QueryKey.USERS]);
    },
  });

const useGetAll = () => useQuery<UserRead[], Error>([QueryKey.USERS], () => UserService.getAllUserGet({}));

// codes
const useGetAllCodes = (userId: number) =>
  useQuery<CodeRead[], Error>([QueryKey.USER_CODES, userId], () =>
    UserService.getUserCodesUserUserIdCodeGet({ userId })
  );

// memo
const useGetAllMemos = (userId: number) =>
  useQuery<MemoRead[], Error>([QueryKey.USER_MEMOS, userId], () =>
    UserService.getUserMemosUserUserIdMemoGet({ userId })
  );

const UserHooks = {
  useGetProjects,
  useGetUser,
  useGetAll,
  useRegister,
  useGetAllCodes,
  useGetAllMemos,
};

export default UserHooks;
