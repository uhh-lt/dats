import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { CodeRead, MemoRead, UserCreate, UserRead, UserService } from "./openapi";

// user
const useGetUser = (userId: number) =>
  useQuery<UserRead, Error>(["user", userId], () => UserService.getByIdUserUserIdGet({ userId }));

const useRegister = (options: UseMutationOptions<UserRead, Error, { requestBody: UserCreate }>) =>
  useMutation(UserService.registerUserPut, options);

// codes
const useGetAllCodes = (userId: number) =>
  useQuery<CodeRead[], Error>(["userCodes", userId], () => UserService.getUserCodesUserUserIdCodeGet({ userId }));

// memo
const useGetAllMemos = (userId: number) =>
  useQuery<MemoRead[], Error>(["userMemos", userId], () => UserService.getUserMemosUserUserIdMemoGet({ userId }));

const UserHooks = {
  useGetUser,
  useRegister,
  useGetAllCodes,
  useGetAllMemos,
};

export default UserHooks;
