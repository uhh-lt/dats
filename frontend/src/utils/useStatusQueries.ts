import { UseQueryResult } from "@tanstack/react-query";

function useStatusQueries<Type>(array: UseQueryResult<Type, unknown>[]) {
  return {
    isLoading: array.some((item) => item.isLoading),
    isError: array.some((item) => item.isError),
    isSuccess: array.every((item) => item.isSuccess),
    error: array.find((item) => item.isError)?.error,
    // todo: check if this is stable when combined with useStableQueries
    data: array.map((item) => item.data),
  };
}

export default useStatusQueries;
