import { GeneralHooks } from "@api/hooks/GeneralHooks";
import { QueryClient } from "@tanstack/react-query";

interface LoginViewLoaderArgs {
  queryClient: QueryClient;
}

export async function loginViewLoader({ queryClient }: LoginViewLoaderArgs) {
  await queryClient.ensureQueryData(GeneralHooks.instanceInfoQueryOptions());
}
