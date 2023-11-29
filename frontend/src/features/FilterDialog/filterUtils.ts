import {
  BooleanOperator,
  DateOperator,
  FilterOperator,
  FilterValueType,
  IDListOperator,
  IDOperator,
  ListOperator,
  LogicalOperator,
  NumberOperator,
  StringOperator,
} from "../../api/openapi";

// TYPES

export type ColumnInfo = {
  label: string;
  column: string;
  sortable: boolean;
  operator: FilterOperator;
  value: FilterValueType;
};

export interface MyFilterExpression<T = string> {
  id: string;
  column: T | number;
  operator: FilterOperators;
  value: string | number | boolean | Array<string>;
}

export interface MyFilter<T = string> {
  id: string;
  items: (MyFilter<T> | MyFilterExpression<T>)[];
  logic_operator: LogicalOperator;
}

export type FilterOperatorType =
  | typeof IDOperator
  | typeof NumberOperator
  | typeof StringOperator
  | typeof IDListOperator
  | typeof ListOperator
  | typeof DateOperator
  | typeof BooleanOperator;

export type FilterOperators =
  | IDOperator
  | NumberOperator
  | StringOperator
  | IDListOperator
  | ListOperator
  | DateOperator
  | BooleanOperator;

// TYPE GUARDS

export const isFilter = (filter: MyFilter | MyFilterExpression): filter is MyFilter => {
  return (filter as MyFilter).items !== undefined;
};

export const isFilterExpression = (filter: MyFilter | MyFilterExpression): filter is MyFilterExpression => {
  return (filter as MyFilter).items === undefined;
};

// MAPS

export const filterOperator2FilterOperatorType: Record<FilterOperator, FilterOperatorType> = {
  [FilterOperator.BOOLEAN]: BooleanOperator,
  [FilterOperator.STRING]: StringOperator,
  [FilterOperator.ID]: IDOperator,
  [FilterOperator.NUMBER]: NumberOperator,
  [FilterOperator.ID_LIST]: IDListOperator,
  [FilterOperator.LIST]: ListOperator,
  [FilterOperator.DATE]: DateOperator,
};

export const operator2HumanReadable: Record<FilterOperators, string> = {
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
  [IDListOperator.ID_LIST_NOT_CONTAINS]: "contains not",
  [ListOperator.LIST_CONTAINS]: "contains",
  [ListOperator.LIST_NOT_CONTAINS]: "contains not",
  [DateOperator.DATE_EQUALS]: "=",
  [DateOperator.DATE_GT]: ">",
  [DateOperator.DATE_LT]: "<",
  [DateOperator.DATE_GTE]: ">=",
  [DateOperator.DATE_LTE]: "<+",
  [BooleanOperator.BOOLEAN_EQUALS]: "is",
  [BooleanOperator.BOOLEAN_NOT_EQUALS]: "is not",
};

// METHODS

export const getDefaultOperator = (operator: FilterOperatorType): FilterOperators => {
  return Object.values(operator)[0];
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

export const countFilterExpressions = (filter: MyFilter): number => {
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
