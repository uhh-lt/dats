import { DocumentTagRead } from "../../../api/openapi";
import { useMemo } from "react";
import SdocHooks from "../../../api/SdocHooks";

function computeTagFrequencies(data: DocumentTagRead[][]): { tagId: number; count: number }[] {
  // count document tags in a map: DocumentTagRead.id -> Count
  // create a mapping tagId -> DocumentTagRead for all data
  const aggregatedTags = new Map<number, number>();
  // const tagMap = new Map<number, DocumentTagRead>();
  data.forEach((documentTags) =>
    documentTags.forEach((documentTag) => {
      let docTagCount = aggregatedTags.get(documentTag.id) || 0;
      aggregatedTags.set(documentTag.id, docTagCount + 1);
      // if (!tagMap.has(documentTag.id)) {
      //   tagMap.set(documentTag.id, documentTag);
      // }
    })
  );

  // resolve DocumentTagRead.id
  // sort by count, descending
  return Array.from(aggregatedTags.entries())
    .map(([docTagId, count]) => ({ tagId: docTagId, count }))
    .sort((a, b) => b.count - a.count);
}

export default function useComputeDocumentTagStats(sdocIds: number[] | undefined) {
  // query DocumentTagRead for all provided source document ids
  const sdocTags = SdocHooks.useGetAllDocumentTagsBatch(sdocIds || []);
  const sdocTagsIsLoading = sdocTags.some((documentTags) => documentTags.isLoading);
  const sdocTagsIsError = sdocTags.some((documentTags) => documentTags.isError);
  const sdocTagsIsSuccess = sdocTags.every((documentTags) => documentTags.isSuccess);

  // use queried metadata to calculate the keywords
  const tagFrequencies = useMemo(() => {
    const isUndefined = sdocTags.some((documentTags) => !documentTags.data);
    if (isUndefined) return computeTagFrequencies([]);
    return computeTagFrequencies(sdocTags.map((documentTags) => documentTags.data!));
  }, [sdocTags]);

  return {
    isLoading: sdocTagsIsLoading,
    isError: sdocTagsIsError,
    isSuccess: sdocTagsIsSuccess,
    error: "An Error occured",
    data: tagFrequencies,
  };
}
