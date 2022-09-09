import {
  AnnotationDocumentCreate,
  AnnotationDocumentRead,
  AnnotationDocumentService,
  BBoxAnnotationReadResolvedCode,
  SpanAnnotationReadResolved,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { useMutation, UseMutationOptions, useQueries, useQuery } from "@tanstack/react-query";
import useStableQueries from "../utils/useStableQueries";

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

const useGetAllSpanAnnotationsBatch = (adocIds: number[]) =>
  useStableQueries(
    useQueries({
      queries: adocIds.map((adocId) => ({
        queryKey: [QueryKey.ADOC_SPAN_ANNOTATIONS, adocId],
        queryFn: () =>
          AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
            adocId: adocId,
            resolve: true,
          }) as Promise<SpanAnnotationReadResolved[]>,
      })),
    })
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

const useGetAllBboxAnnotationsBatch = (adocIds: number[]) =>
  useStableQueries(
    useQueries({
      queries: adocIds.map((adocId) => ({
        queryKey: [QueryKey.ADOC_BBOX_ANNOTATIONS, adocId],
        queryFn: () =>
          AnnotationDocumentService.getAllBboxAnnotationsAdocAdocIdBboxAnnotationsGet({
            adocId: adocId,
            resolve: true,
          }) as Promise<BBoxAnnotationReadResolvedCode[]>,
      })),
    })
  );

const AdocHooks = {
  useGetAllSpanAnnotations,
  useGetAllBboxAnnotations,
  useCreateAdoc,
  useGetAllSpanAnnotationsBatch,
  useGetAllBboxAnnotationsBatch,
};

export default AdocHooks;
