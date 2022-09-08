import {
  AnnotationDocumentCreate,
  AnnotationDocumentRead,
  AnnotationDocumentService,
  BBoxAnnotationReadResolvedCode,
  SpanAnnotationReadResolved,
} from "./openapi";
import { QueryKey } from "./QueryKey";
import { useMutation, UseMutationOptions, useQuery } from "@tanstack/react-query";
import { flatten } from "lodash";

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

// todo: refactor this when applying react bulletproof architecture
export const spanAnnoKeyFactory = {
  visible: (ids: number[]) => [QueryKey.ADOCS_SPAN_ANNOTATIONS, ids.sort()] as const,
};
const useGetSpanAnnotationsBatch = (adocIds: number[]) =>
  useQuery<
    SpanAnnotationReadResolved[],
    Error,
    SpanAnnotationReadResolved[],
    ReturnType<typeof spanAnnoKeyFactory["visible"]>
  >(spanAnnoKeyFactory.visible(adocIds), async ({ queryKey }) => {
    const ids = queryKey[1];
    const queries = ids.map(
      (adocId) =>
        AnnotationDocumentService.getAllSpanAnnotationsAdocAdocIdSpanAnnotationsGet({
          adocId: adocId,
          resolve: true,
          limit: 1000,
        }) as Promise<SpanAnnotationReadResolved[]>
    );
    const annotations = await Promise.all(queries);
    return annotations.flat();
  });

// todo: refactor this when applying react bulletproof architecture
export const bboxAnnoKeyFactory = {
  visible: (ids: number[]) => [QueryKey.ADOCS_BBOX_ANNOTATIONS, ids.sort()] as const,
};
const useGetBboxAnnotationsBatch = (adocIds: number[]) =>
  useQuery<
    BBoxAnnotationReadResolvedCode[],
    Error,
    BBoxAnnotationReadResolvedCode[],
    ReturnType<typeof bboxAnnoKeyFactory["visible"]>
  >(bboxAnnoKeyFactory.visible(adocIds), async ({ queryKey }) => {
    const ids = queryKey[1];
    const queries = ids.map(
      (adocId) =>
        AnnotationDocumentService.getAllBboxAnnotationsAdocAdocIdBboxAnnotationsGet({
          adocId: adocId,
          resolve: true,
        }) as Promise<BBoxAnnotationReadResolvedCode[]>
    );
    const annotations = await Promise.all(queries);
    return flatten(annotations);
  });

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
  useGetSpanAnnotationsBatch,
  useGetBboxAnnotationsBatch,
};

export default AdocHooks;
