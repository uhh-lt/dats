import { QueryClient } from "@tanstack/react-query";
import { instanceInfoQueryOptions } from "../../_api/authQueryOptions";

interface LoginViewLoaderArgs {
  queryClient: QueryClient;
}

export async function loginViewLoader({ queryClient }: LoginViewLoaderArgs) {
  await queryClient.ensureQueryData(instanceInfoQueryOptions());
}
