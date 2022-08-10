import {
  AnnotationDocumentCreate,
  AnnotationDocumentRead,
  AnnotationDocumentService,
  BBoxAnnotationReadResolvedCode,
  SpanAnnotationReadResolved,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";

const useCreateAdoc = (
  options: UseMutationOptions<AnnotationDocumentRead, Error, { requestBody: AnnotationDocumentCreate }>
) => useMutation(AnnotationDocumentService.createAdocPut, options);

const useGetAllSpanAnnotations = (adocId: number | undefined) =>
  useQuery<SpanAnnotationReadResolved[], Error>(
    [QueryKey.ADOC_SPAN_ANNOTATIONS, adocId],
    () =>
      AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
        adocId: adocId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved[]>,
    {
      enabled: !!adocId,
    }
  );

const useGetAllBboxAnnotations = (adocId: number | undefined) =>
  useQuery<BBoxAnnotationReadResolvedCode[], Error>(
    [QueryKey.ADOC_BBOX_ANNOTATIONS, adocId],
    () =>
      AnnotationDocumentService.getAllBboxAnnotationsAdocAdocIdBboxAnnotationsGet({
        adocId: adocId!,
        resolve: true,
      }) as Promise<BBoxAnnotationReadResolvedCode[]>,
    {
      enabled: !!adocId,
    }
  );

const AdocHooks = {
  useGetAllSpanAnnotations,
  useGetAllBboxAnnotations,
  useCreateAdoc,
};

export default AdocHooks;
