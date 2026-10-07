import { sdocQueries } from "@api/queries/sdocQueries";
import { QueryClient } from "@tanstack/react-query";

interface AnnotationViewLoaderArgs {
  queryClient: QueryClient;
  sdocId: number;
}

export async function annotationViewLoader({ queryClient, sdocId }: AnnotationViewLoaderArgs) {
  const [sdoc] = await Promise.all([
    queryClient.ensureQueryData(sdocQueries.detailRequired(sdocId)),
    queryClient.ensureQueryData(sdocQueries.dataRequired(sdocId)),
  ]);

  return sdoc;
}
