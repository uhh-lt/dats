import { useQuery } from "@tanstack/react-query";
import { authQueries } from "./authQueries";

const useGetInstanceInfo = () => useQuery(authQueries.instanceInfo());

export const AuthHooks = {
  useGetInstanceInfo,
};
