import { SourceDocumentDataRead } from "@models/SourceDocumentDataRead";
import { useMemo } from "react";
import { IToken } from "./annotationDocumentTypes";

/**
 * Derives token metadata from a source document's raw tokens and character offsets.
 *
 * Each token is enriched with its character boundaries, index, whitespace flag,
 * and newline count. The result is memoized on `sdocData` and only recomputed
 * when the document data changes.
 *
 * @param sdocData The source document data containing tokens and their character offsets.
 * @returns The enriched token array, or `undefined` if no character offsets are available.
 */
export function useTokenData(sdocData: SourceDocumentDataRead): IToken[] | undefined {
  return useMemo(() => {
    if (!sdocData.token_character_offsets) return undefined;

    const offsets = sdocData.token_character_offsets;
    return sdocData.tokens.map((text, index) => ({
      beginChar: offsets[index][0],
      endChar: offsets[index][1],
      index,
      text,
      whitespace: offsets.length > index + 1 && offsets[index + 1][0] - offsets[index][1] > 0,
      newLine: text.split("\n").length - 1,
    }));
  }, [sdocData]);
}
