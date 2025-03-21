import { BooleanOperator } from "../../api/openapi/models/BooleanOperator.ts";
import { DateOperator } from "../../api/openapi/models/DateOperator.ts";
import { FilterOperator } from "../../api/openapi/models/FilterOperator.ts";
import { FilterValueType } from "../../api/openapi/models/FilterValueType.ts";
import { IDListOperator } from "../../api/openapi/models/IDListOperator.ts";
import { IDOperator } from "../../api/openapi/models/IDOperator.ts";
import { ListOperator } from "../../api/openapi/models/ListOperator.ts";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { NumberOperator } from "../../api/openapi/models/NumberOperator.ts";
import { StringOperator } from "../../api/openapi/models/StringOperator.ts";
import { dateToLocaleYYYYMMDDString } from "../../utils/DateUtils.ts";

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
  value: boolean | string | number | string[] | string[][];
}

export interface MyFilter<T = string> {
  id: string;
  items: (MyFilter<T> | MyFilterExpression<T>)[];
  logic_operator: LogicalOperator;
}

export const createEmptyFilter = (id: string): MyFilter => {
  return {
    id,
    items: [],
    logic_operator: LogicalOperator.AND,
  };
};

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

export const filterOperator2defaultValue: Record<FilterOperator, boolean | string | number | string[]> = {
  [FilterOperator.BOOLEAN]: false,
  [FilterOperator.STRING]: "",
  [FilterOperator.ID]: 0,
  [FilterOperator.NUMBER]: 0,
  [FilterOperator.ID_LIST]: [],
  [FilterOperator.LIST]: [],
  [FilterOperator.DATE]: dateToLocaleYYYYMMDDString(new Date()),
};

export const filterOperator2FilterOperatorType: Record<FilterOperator, FilterOperatorType> = {
  [FilterOperator.BOOLEAN]: BooleanOperator,
  [FilterOperator.STRING]: StringOperator,
  [FilterOperator.ID]: IDOperator,
  [FilterOperator.NUMBER]: NumberOperator,
  [FilterOperator.ID_LIST]: IDListOperator,
  [FilterOperator.LIST]: ListOperator,
  [FilterOperator.DATE]: DateOperator,
};

// this has to align with FilterValueSelector.tsx
export const filterValueType2defaultValue: Record<FilterValueType, boolean | string | number | string[]> = {
  [FilterValueType.CODE_ID]: -1,
  [FilterValueType.DOC_TYPE]: "none",
  [FilterValueType.SDOC_ID]: 0,
  [FilterValueType.SPAN_ANNOTATION]: ["-1", ""],
  [FilterValueType.TAG_ID]: -1,
  [FilterValueType.USER_ID]: -1,
  [FilterValueType.INFER_FROM_OPERATOR]: false,
};

// METHODS
export const getDefaultValue = (valueType: FilterValueType, operator: FilterOperator) => {
  if (valueType === FilterValueType.INFER_FROM_OPERATOR) {
    return filterOperator2defaultValue[operator];
  } else {
    return filterValueType2defaultValue[valueType];
  }
};

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
