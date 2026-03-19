import { SdocHooks } from "@api/hooks/SdocHooks";
import { QueryClient } from "@tanstack/react-query";

interface AnnotationViewLoaderArgs {
  queryClient: QueryClient;
  sdocId: number;
}

export async function annotationViewLoader({ queryClient, sdocId }: AnnotationViewLoaderArgs) {
  const [sdoc] = await Promise.all([
    queryClient.ensureQueryData(SdocHooks.getDocumentQueryOptions(sdocId)),
    queryClient.ensureQueryData(SdocHooks.getDocumentDataQueryOptions(sdocId)),
  ]);

  return sdoc;
}
