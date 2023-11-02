import { DBColumns, Filter, FilterExpression, IDOperator, NumberOperator, StringOperator } from "../../api/openapi";

export interface MyFilterExpression extends FilterExpression {
  id: string;
}

export interface MyFilter extends Filter {
  id: string;
  items: (MyFilter | MyFilterExpression)[];
}

export type FilterOperators = FilterExpression["operator"];

export const isFilter = (filter: Filter | FilterExpression): filter is Filter => {
  return (filter as Filter).items !== undefined;
};

export const isFilterExpression = (filter: Filter | FilterExpression): filter is FilterExpression => {
  return (filter as Filter).items === undefined;
};

export const column2operator: Record<DBColumns, typeof IDOperator | typeof NumberOperator | typeof StringOperator> = {
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
};

export const column2defaultOperator: Record<DBColumns, FilterOperators> = {
  [DBColumns.SPAN_TEXT]: StringOperator.STRING_CONTAINS,
  [DBColumns.SOURCE_DOCUMENT_ID]: IDOperator.ID_EQUALS,
  [DBColumns.SOURCE_DOCUMENT_FILENAME]: StringOperator.STRING_CONTAINS,
  [DBColumns.CODE_ID]: IDOperator.ID_EQUALS,
  [DBColumns.CODE_NAME]: StringOperator.STRING_CONTAINS,
  [DBColumns.DOCUMENT_TAG_ID]: IDOperator.ID_EQUALS,
  [DBColumns.DOCUMENT_TAG_TITLE]: StringOperator.STRING_CONTAINS,
  [DBColumns.MEMO_ID]: IDOperator.ID_EQUALS,
  [DBColumns.MEMO_CONTENT]: StringOperator.STRING_CONTAINS,
  [DBColumns.MEMO_TITLE]: StringOperator.STRING_CONTAINS,
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
