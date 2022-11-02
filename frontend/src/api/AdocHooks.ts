import { AnnotationDocumentService, BBoxAnnotationReadResolvedCode, SpanAnnotationReadResolved } from "./openapi";
import { QueryKey } from "./QueryKey";
import { useMutation, useQueries, useQuery } from "@tanstack/react-query";
import useStableQueries from "../utils/useStableQueries";
import queryClient from "../plugins/ReactQueryClient";
import { useSelectEnabledBboxAnnotations, useSelectEnabledSpanAnnotations } from "./utils";

const useCreateAdoc = () =>
  useMutation(AnnotationDocumentService.create, {
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.SDOC_ADOCS, data.source_document_id]);
    },
  });

const useGetAllSpanAnnotations = (adocId: number | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledSpanAnnotations();
  return useQuery<SpanAnnotationReadResolved[], Error>(
    [QueryKey.ADOC_SPAN_ANNOTATIONS, adocId],
    () =>
      AnnotationDocumentService.getAllSpanAnnotations({
        adocId: adocId!,
        resolve: true,
      }) as Promise<SpanAnnotationReadResolved[]>,
    {
      enabled: !!adocId,
      select: selectEnabledAnnotations,
    }
  );
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
            includeSentences: true,
          }) as Promise<SpanAnnotationReadResolved[]>,
        select: selectEnabledAnnotations,
      })),
    })
  );
};

const useGetAllBboxAnnotations = (adocId: number | undefined) => {
  // filter out all disabled code ids
  const selectEnabledAnnotations = useSelectEnabledBboxAnnotations();
  return useQuery<BBoxAnnotationReadResolvedCode[], Error>(
    [QueryKey.ADOC_BBOX_ANNOTATIONS, adocId],
    () =>
      AnnotationDocumentService.getAllBboxAnnotations({
        adocId: adocId!,
        resolve: true,
      }) as Promise<BBoxAnnotationReadResolvedCode[]>,
    {
      enabled: !!adocId,
      select: selectEnabledAnnotations,
    }
  );
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
    })
  );
};

const AdocHooks = {
  useGetAllSpanAnnotations,
  useGetAllBboxAnnotations,
  useCreateAdoc,
  useGetAllSpanAnnotationsBatch,
  useGetAllBboxAnnotationsBatch,
};

export default AdocHooks;
