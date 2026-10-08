import { generalQueries } from "@api/queries/generalQueries";
import { QueryClient } from "@tanstack/react-query";

interface LoginViewLoaderArgs {
  queryClient: QueryClient;
}

export async function loginViewLoader({ queryClient }: LoginViewLoaderArgs) {
  await queryClient.ensureQueryData(generalQueries.instanceInfo());
}
