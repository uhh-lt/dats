import {
  ArrayOperator,
  DBColumns,
  DocType,
  Filter,
  FilterExpression,
  IDOperator,
  MetaType,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";

export interface MyFilterExpression extends FilterExpression {
  id: string;
  docType?: DocType;
}

export interface MyFilter extends Filter {
  id: string;
  items: (MyFilter | MyFilterExpression)[];
}

export const isFilter = (filter: Filter | FilterExpression): filter is Filter => {
  return (filter as Filter).items !== undefined;
};

export const isFilterExpression = (filter: Filter | FilterExpression): filter is FilterExpression => {
  return (filter as Filter).items === undefined;
};

export const getFilterExpressionColumn = (filter: MyFilterExpression): string => {
  if (filter.column === DBColumns.METADATA) {
    return `META-${filter.docType}-${filter.metadata_key}`;
  }
  return filter.column;
};

export type FilterOperatorType =
  | typeof IDOperator
  | typeof NumberOperator
  | typeof StringOperator
  | typeof ArrayOperator;
export type FilterOperator = FilterExpression["operator"];

export const metaType2operator: Record<MetaType, FilterOperatorType> = {
  [MetaType.STRING]: StringOperator,
  [MetaType.NUMBER]: NumberOperator,
  [MetaType.DATE]: IDOperator,
  [MetaType.LIST]: ArrayOperator,
};

export const getDefaultOperator = (operator: FilterOperatorType): FilterOperator => {
  return Object.values(operator)[0];
};

export const column2operator: Record<DBColumns, FilterOperatorType> = {
  [DBColumns.SPAN_TEXT]: StringOperator,
  [DBColumns.SOURCE_DOCUMENT_ID]: IDOperator,
  [DBColumns.SOURCE_DOCUMENT_FILENAME]: StringOperator,
  [DBColumns.CODE_ID]: IDOperator,
  [DBColumns.CODE_NAME]: StringOperator,
  [DBColumns.DOCUMENT_TAG_ID]: IDOperator,
  [DBColumns.DOCUMENT_TAG_TITLE]: StringOperator,
  [DBColumns.MEMO_ID]: IDOperator,
  [DBColumns.MEMO_CONTENT]: StringOperator,
  [DBColumns.MEMO_TITLE]: StringOperator,
  [DBColumns.METADATA]: StringOperator,
  [DBColumns.CODE_ID_LIST]: ArrayOperator,
  [DBColumns.DOCUMENT_TAG_ID_LIST]: ArrayOperator,
  [DBColumns.USER_ID]: IDOperator,
  [DBColumns.USER_ID_LIST]: ArrayOperator,
  [DBColumns.SPAN_ANNOTATION_ID]: IDOperator,
  [DBColumns.SPAN_ANNOTATION_ID_LIST]: ArrayOperator,
};

export const column2InputType: Record<DBColumns, string> = {
  [DBColumns.SPAN_TEXT]: "text",
  [DBColumns.SOURCE_DOCUMENT_ID]: "number",
  [DBColumns.SOURCE_DOCUMENT_FILENAME]: "text",
  [DBColumns.CODE_ID]: "number",
  [DBColumns.CODE_NAME]: "text",
  [DBColumns.DOCUMENT_TAG_ID]: "number",
  [DBColumns.DOCUMENT_TAG_TITLE]: "text",
  [DBColumns.MEMO_ID]: "number",
  [DBColumns.MEMO_CONTENT]: "text",
  [DBColumns.MEMO_TITLE]: "text",
  [DBColumns.METADATA]: "text",
  [DBColumns.CODE_ID_LIST]: "number",
  [DBColumns.DOCUMENT_TAG_ID_LIST]: "number",
  [DBColumns.USER_ID]: "number",
  [DBColumns.USER_ID_LIST]: "number",
  [DBColumns.SPAN_ANNOTATION_ID]: "number",
  [DBColumns.SPAN_ANNOTATION_ID_LIST]: "number",
};

export const findInFilter = (filter: MyFilter, filterId: string): MyFilter | MyFilterExpression | undefined => {
  const stack: (MyFilter | MyFilterExpression)[] = [filter];
  while (stack?.length > 0) {
    const currentFilter = stack.pop();
    if (!currentFilter) return undefined;

    if (currentFilter.id === filterId) {
      return currentFilter;
    }
    if (isFilter(currentFilter)) {
      stack.push(...currentFilter.items);
    }
  }
  return undefined;
};

export const deleteInFilter = (filter: MyFilter, filterId: string): MyFilter => {
  return {
    ...filter,
    items: filter.items
      .filter((item) => item.id !== filterId)
      .map((item) => {
        if (isFilter(item)) {
          return deleteInFilter(item, filterId);
        } else {
          return item;
        }
      }),
  };
};

export const countFilterExpressiosn = (filter: MyFilter): number => {
  let count = 0;
  const stack: (MyFilter | MyFilterExpression)[] = [filter];
  while (stack?.length > 0) {
    const currentFilter = stack.pop();
    if (!currentFilter) return count;

    if (isFilter(currentFilter)) {
      stack.push(...currentFilter.items);
    } else {
      count++;
    }
  }
  return count;
};
