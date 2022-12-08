import { SpanEntity } from "../../api/openapi";

// export const isSpanEntity = (varToCheck: any): varToCheck is SpanEntity =>
//   (varToCheck as SpanEntity).code_id !== undefined;
// const isString = (varToCheck: any): varToCheck is string => typeof varToCheck === "string";
// const isNumber = (varToCheck: any): varToCheck is number => typeof varToCheck === "number";

export enum FilterType {
  CODE,
  TAG,
  KEYWORD,
  TERM,
  SENTENCE,
  IMAGE,
  FILENAME,
  METADATA,
}

export type SearchFilter = {
  id: string;
  data: SpanEntity | number | string | { key: string; value: string };
  type: FilterType;
};

export function createDocumentTagFilter(tagId: number): SearchFilter {
  return {
    id: `tag-${tagId}`,
    data: tagId,
    type: FilterType.TAG,
  };
}

export function createCodeFilter(codeId: number, annotatedText: string): SearchFilter {
  return {
    id: `code-${codeId}-${annotatedText}`,
    data: { code_id: codeId, span_text: annotatedText },
    type: FilterType.CODE,
  };
}

export function createKeywordFilter(keyword: string): SearchFilter {
  return {
    id: `keyword-${keyword}`,
    data: keyword,
    type: FilterType.KEYWORD,
  };
}

export function createTermFilter(term: string): SearchFilter {
  return {
    id: `text-${term}`,
    data: term,
    type: FilterType.TERM,
  };
}

export function createSentenceFilter(sentence: string): SearchFilter {
  return {
    id: `sentence-${sentence}`,
    data: sentence,
    type: FilterType.SENTENCE,
  };
}

export function createImageFilter(imageSdocId: number): SearchFilter {
  return {
    id: `image-${imageSdocId}`,
    data: imageSdocId,
    type: FilterType.IMAGE,
  };
}

export function createFilenameFilter(filename: string): SearchFilter {
  return {
    id: `file-${filename}`,
    data: filename,
    type: FilterType.FILENAME,
  };
}

export function createMetadataFilter(key: string, value: string): SearchFilter {
  return {
    id: `metadata-${key}-${value}`,
    data: { key: key, value: value },
    type: FilterType.METADATA,
  };
}

export function orderFilters(filters: SearchFilter[]) {
  const keywords: string[] = [];
  const tags: number[] = [];
  const codes: SpanEntity[] = [];
  const terms: string[] = [];
  const sentences: string[] = [];
  const images: number[] = [];
  const filenames: string[] = [];
  const metadata: { key: string; value: string }[] = [];
  filters.forEach((filter) => {
    switch (filter.type) {
      case FilterType.CODE:
        codes.push(filter.data as SpanEntity);
        break;
      case FilterType.KEYWORD:
        keywords.push(filter.data as string);
        break;
      case FilterType.TAG:
        tags.push(filter.data as number);
        break;
      case FilterType.TERM:
        terms.push(filter.data as string);
        break;
      case FilterType.SENTENCE:
        sentences.push(filter.data as string);
        break;
      case FilterType.IMAGE:
        images.push(filter.data as number);
        break;
      case FilterType.FILENAME:
        filenames.push(filter.data as string);
        break;
      case FilterType.METADATA:
        metadata.push(filter.data as { key: string; value: string });
        break;
    }
  });
  return { keywords, tags, codes, terms, sentences, images, filenames, metadata };
}
