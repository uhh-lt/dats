import { SpanEntity } from "../../api/openapi";

// export const isSpanEntity = (varToCheck: any): varToCheck is SpanEntity =>
//   (varToCheck as SpanEntity).code_id !== undefined;
// const isString = (varToCheck: any): varToCheck is string => typeof varToCheck === "string";
// const isNumber = (varToCheck: any): varToCheck is number => typeof varToCheck === "number";

export enum SearchFilterType {
  CODE,
  TAG,
  KEYWORD,
  TEXT,
}

export type SearchFilter = {
  id: string;
  data: SpanEntity | number | string;
  type: SearchFilterType;
};

export function createDocumentTagFilter(tagId: number): SearchFilter {
  return {
    id: `tag-${tagId}`,
    data: tagId,
    type: SearchFilterType.TAG,
  };
}

export function createCodeFilter(codeId: number, annotatedText: string): SearchFilter {
  return {
    id: `code-${codeId}-${annotatedText}`,
    data: { code_id: codeId, span_text: annotatedText },
    type: SearchFilterType.CODE,
  };
}

export function createKeywordFilter(keyword: string): SearchFilter {
  return {
    id: `keyword-${keyword}`,
    data: keyword,
    type: SearchFilterType.KEYWORD,
  };
}

export function createTextFilter(text: string): SearchFilter {
  return {
    id: `text-${text}`,
    data: text,
    type: SearchFilterType.TEXT,
  };
}

export function orderFilter(filters: SearchFilter[]) {
  const keywords: string[] = [];
  const tags: number[] = [];
  const codes: SpanEntity[] = [];
  const texts: string[] = [];
  filters.forEach((filter) => {
    switch (filter.type) {
      case SearchFilterType.CODE:
        codes.push(filter.data as SpanEntity);
        break;
      case SearchFilterType.KEYWORD:
        keywords.push(filter.data as string);
        break;
      case SearchFilterType.TAG:
        tags.push(filter.data as number);
        break;
      case SearchFilterType.TEXT:
        texts.push(filter.data as string);
        break;
    }
  });
  return { keywords, tags, codes, texts };
}
