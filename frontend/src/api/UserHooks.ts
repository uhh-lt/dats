import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { CodeRead, MemoRead, ProjectRead, UserCreate, UserRead, UserService } from "./openapi";
import { QueryKey } from "./QueryKey";

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
const useGetUser = (userId: number) =>
  useQuery<UserRead, Error>(["user", userId], () => UserService.getByIdUserUserIdGet({ userId }));

const useRegister = (options: UseMutationOptions<UserRead, Error, { requestBody: UserCreate }>) =>
  useMutation(UserService.registerUserPut, options);

const useGetAll = () => useQuery<UserRead[], Error>([QueryKey.USERS], () => UserService.getAllUserGet({}));

// codes
const useGetAllCodes = (userId: number) =>
  useQuery<CodeRead[], Error>(["userCodes", userId], () => UserService.getUserCodesUserUserIdCodeGet({ userId }));

// memo
const useGetAllMemos = (userId: number) =>
  useQuery<MemoRead[], Error>(["userMemos", userId], () => UserService.getUserMemosUserUserIdMemoGet({ userId }));

const UserHooks = {
  useGetProjects,
  useGetUser,
  useGetAll,
  useRegister,
  useGetAllCodes,
  useGetAllMemos,
};

export default UserHooks;
