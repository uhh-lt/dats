import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import queryClient from "../plugins/ReactQueryClient.ts";
import useStableQueries from "../utils/useStableQueries.ts";
import { QueryKey } from "./QueryKey.ts";
import { AnnotationDocumentRead } from "./openapi/models/AnnotationDocumentRead.ts";
import { BBoxAnnotationReadResolvedCode } from "./openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { SpanAnnotationReadResolved } from "./openapi/models/SpanAnnotationReadResolved.ts";
import { AnnotationDocumentService } from "./openapi/services/AnnotationDocumentService.ts";
import { useSelectEnabledBboxAnnotations, useSelectEnabledSpanAnnotations } from "./utils.ts";

const useCreateAdoc = () =>
  useMutation({
    mutationFn: AnnotationDocumentService.create,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [QueryKey.SDOC_ADOCS, data.source_document_id] });
    },
  });

const useGetAdoc = (adocId: number | null | undefined) => {
  // filter out all disabled code ids
  return useQuery<AnnotationDocumentRead, Error>({
    queryKey: [QueryKey.ADOC, adocId],
    queryFn: () =>
      AnnotationDocumentService.getByAdocId({
        adocId: adocId!,
      }),
    enabled: !!adocId,
  });
};

const useGetAllSpanAnnotations = (adocId: number | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useQuery<SpanAnnotationReadResolved[], Error>({
    queryKey: [QueryKey.ADOC_SPAN_ANNOTATIONS, adocId],
    queryFn: () =>
      AnnotationDocumentService.getAllSpanAnnotations({
        adocId: adocId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved[]>,
    enabled: !!adocId,
    select: selectEnabledAnnotations,
  });
};

const useGetAllSpanAnnotationsBatch = (adocIds: number[]) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useStableQueries(
    useQueries({
      queries: adocIds.map((adocId) => ({
        queryKey: [QueryKey.ADOC_SPAN_ANNOTATIONS, adocId],
        queryFn: () =>
          AnnotationDocumentService.getAllSpanAnnotations({
            adocId: adocId,
            resolve: true,
          }) as Promise<SpanAnnotationReadResolved[]>,
        select: selectEnabledAnnotations,
      })),
    }),
  );
};

const useGetAllBboxAnnotations = (adocId: number | null | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledBboxAnnotations();
  return useQuery<BBoxAnnotationReadResolvedCode[], Error>({
    queryKey: [QueryKey.ADOC_BBOX_ANNOTATIONS, adocId],
    queryFn: () =>
      AnnotationDocumentService.getAllBboxAnnotations({
        adocId: adocId!,
        resolve: true,
      }) as Promise<BBoxAnnotationReadResolvedCode[]>,
    enabled: !!adocId,
    select: selectEnabledAnnotations,
  });
};

const useGetAllBboxAnnotationsBatch = (adocIds: number[]) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledBboxAnnotations();
  return useStableQueries(
    useQueries({
      queries: adocIds.map((adocId) => ({
        queryKey: [QueryKey.ADOC_BBOX_ANNOTATIONS, adocId],
        queryFn: () =>
          AnnotationDocumentService.getAllBboxAnnotations({
            adocId: adocId,
            resolve: true,
          }) as Promise<BBoxAnnotationReadResolvedCode[]>,
        select: selectEnabledAnnotations,
      })),
    }),
  );
};

const AdocHooks = {
  useGetAdoc,
  useGetAllSpanAnnotations,
  useGetAllBboxAnnotations,
  useCreateAdoc,
  useGetAllSpanAnnotationsBatch,
  useGetAllBboxAnnotationsBatch,
};

export default AdocHooks;
