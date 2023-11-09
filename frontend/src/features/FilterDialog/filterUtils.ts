import {
  BooleanOperator,
  DBColumns,
  DateOperator,
  DocType,
  Filter,
  FilterExpression,
  IDListOperator,
  IDOperator,
  ListOperator,
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

export const getFilterExpressionColumnValue = (filter: MyFilterExpression): string => {
  if (filter.column === DBColumns.METADATA) {
    return filter.project_metadata_id!.toString();
  }
  return filter.column;
};

export type FilterOperatorType =
  | typeof IDOperator
  | typeof NumberOperator
  | typeof StringOperator
  | typeof IDListOperator
  | typeof ListOperator
  | typeof DateOperator
  | typeof BooleanOperator;
export type FilterOperator = FilterExpression["operator"];

export const metaType2operator: Record<MetaType, FilterOperatorType> = {
  [MetaType.STRING]: StringOperator,
  [MetaType.NUMBER]: NumberOperator,
  [MetaType.DATE]: DateOperator,
  [MetaType.LIST]: ListOperator,
  [MetaType.BOOLEAN]: BooleanOperator,
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
  [DBColumns.CODE_ID_LIST]: IDListOperator,
  [DBColumns.DOCUMENT_TAG_ID_LIST]: IDListOperator,
  [DBColumns.USER_ID]: IDOperator,
  [DBColumns.USER_ID_LIST]: IDListOperator,
  [DBColumns.SPAN_ANNOTATION_ID]: IDOperator,
  [DBColumns.SPAN_ANNOTATION_ID_LIST]: IDListOperator,
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

export const operator2HumanReadable: Record<FilterOperator, string> = {
  [IDOperator.ID_EQUALS]: "=",
  [IDOperator.ID_NOT_EQUALS]: "!=",
  [NumberOperator.NUMBER_EQUALS]: "=",
  [NumberOperator.NUMBER_NOT_EQUALS]: "!=",
  [NumberOperator.NUMBER_GT]: ">",
  [NumberOperator.NUMBER_LT]: "<",
  [NumberOperator.NUMBER_GTE]: ">=",
  [NumberOperator.NUMBER_LTE]: "<=",
  [StringOperator.STRING_CONTAINS]: "contains",
  [StringOperator.STRING_EQUALS]: "equals",
  [StringOperator.STRING_NOT_EQUALS]: "not equals",
  [StringOperator.STRING_STARTS_WITH]: "starts with",
  [StringOperator.STRING_ENDS_WITH]: "ends with",
  [IDListOperator.ID_LIST_CONTAINS]: "contains",
  [ListOperator.LIST_CONTAINS]: "contains",
  [DateOperator.DATE_GT]: ">",
  [DateOperator.DATE_LT]: "<",
  [DateOperator.DATE_GTE]: ">=",
  [DateOperator.DATE_LTE]: "<+",
  [BooleanOperator.BOOLEAN_EQUALS]: "is",
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

export const isValidDate = (d: any) => {
  return !isNaN(d) && d instanceof Date;
};

export const isValidDateString = (dateString: string): boolean => {
  return isValidDate(new Date(dateString));
};
