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
  const sdocTags = SdocHooks.useGetAllDocumentsTags(sdocIds);

  // use queried metadata to calculate the keywords
  const tagFrequencies = useMemo(() => {
    return computeTagFrequencies(sdocTags.data || []);
  }, [sdocTags.data]);

  return {
    isLoading: sdocTags.isLoading,
    isError: sdocTags.isError,
    isSuccess: sdocTags.isSuccess,
    error: sdocTags.error,
    data: tagFrequencies,
  };
}
