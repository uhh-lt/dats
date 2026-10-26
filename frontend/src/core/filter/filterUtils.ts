import { AttachedObjectOperator } from "@models/AttachedObjectOperator";
import { AttachedObjectTypeOperator } from "@models/AttachedObjectTypeOperator";
import { BooleanOperator } from "@models/BooleanOperator";
import { DateOperator } from "@models/DateOperator";
import { FilterOperator } from "@models/FilterOperator";
import { FilterValueType } from "@models/FilterValueType";
import { IDListOperator } from "@models/IDListOperator";
import { IDListRecursiveOperator } from "@models/IDListRecursiveOperator";
import { IDOperator } from "@models/IDOperator";
import { ListOperator } from "@models/ListOperator";
import { LogicalOperator } from "@models/LogicalOperator";
import { NumberOperator } from "@models/NumberOperator";
import { SpanAnnotationOperator } from "@models/SpanAnnotationOperator";
import { StringOperator } from "@models/StringOperator";
import { SortDirection } from "@models/SortDirection";
import { toLocalYYYYMMDD } from "@utils/DateUtils";
import type { MRT_SortingState } from "material-react-table";

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

export type FilterOperatorType =
  | typeof IDOperator
  | typeof NumberOperator
  | typeof StringOperator
  | typeof IDListOperator
  | typeof IDListRecursiveOperator
  | typeof ListOperator
  | typeof DateOperator
  | typeof BooleanOperator
  | typeof AttachedObjectTypeOperator
  | typeof AttachedObjectOperator
  | typeof SpanAnnotationOperator;

export type FilterOperators =
  | IDOperator
  | NumberOperator
  | StringOperator
  | IDListOperator
  | IDListRecursiveOperator
  | ListOperator
  | DateOperator
  | BooleanOperator
  | AttachedObjectTypeOperator
  | AttachedObjectOperator
  | SpanAnnotationOperator;

// TYPE GUARDS

export const isFilter = <T = string>(filter: MyFilter<T> | MyFilterExpression<T>): filter is MyFilter<T> => {
  return "items" in filter;
};

export const isFilterExpression = <T = string>(
  filter: MyFilter<T> | MyFilterExpression<T>,
): filter is MyFilterExpression<T> => {
  return !("items" in filter);
};

// MAPS

export const filterOperator2defaultValue: Record<FilterOperator, boolean | string | number | string[]> = {
  [FilterOperator.BOOLEAN]: false,
  [FilterOperator.STRING]: "",
  [FilterOperator.ID]: 0,
  [FilterOperator.NUMBER]: 0,
  [FilterOperator.ID_LIST]: [],
  [FilterOperator.ID_LIST_RECURSIVE]: [],
  [FilterOperator.LIST]: [],
  [FilterOperator.DATE]: toLocalYYYYMMDD(new Date()),
  [FilterOperator.ATTACHED_OBJECT_TYPE]: "project",
  [FilterOperator.ATTACHED_OBJECT]: ["code", "-1"],
  [FilterOperator.SPAN_ANNOTATION]: ["-1", ""],
};

export const filterOperator2FilterOperatorType: Record<FilterOperator, FilterOperatorType> = {
  [FilterOperator.BOOLEAN]: BooleanOperator,
  [FilterOperator.STRING]: StringOperator,
  [FilterOperator.ID]: IDOperator,
  [FilterOperator.NUMBER]: NumberOperator,
  [FilterOperator.ID_LIST]: IDListOperator,
  [FilterOperator.ID_LIST_RECURSIVE]: IDListRecursiveOperator,
  [FilterOperator.LIST]: ListOperator,
  [FilterOperator.DATE]: DateOperator,
  [FilterOperator.ATTACHED_OBJECT_TYPE]: AttachedObjectTypeOperator,
  [FilterOperator.ATTACHED_OBJECT]: AttachedObjectOperator,
  [FilterOperator.SPAN_ANNOTATION]: SpanAnnotationOperator,
};

// this has to align with FilterValueSelector.tsx
export const filterValueType2defaultValue: Record<FilterValueType, boolean | string | number | string[]> = {
  [FilterValueType.ATTACHED_OBJECT_TYPE]: "project",
  [FilterValueType.ATTACHED_OBJECT]: ["code", "-1"],
  [FilterValueType.CODE_ID]: -1,
  [FilterValueType.DOC_TYPE]: "none",
  [FilterValueType.FOLDER_ID]: -1,
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

export const findInFilter = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
): MyFilter<T> | MyFilterExpression<T> | undefined => {
  const stack: (MyFilter<T> | MyFilterExpression<T>)[] = [filter];
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

export const deleteInFilter = <T = string>(filter: MyFilter<T>, filterId: string): MyFilter<T> => {
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

// EDITING: pure functions, each returns a new filter (never mutate a MyFilter)

export const createEmptyFilter = <T = string>(id: string): MyFilter<T> => {
  return {
    id,
    items: [],
    logic_operator: LogicalOperator.AND,
  };
};

export const cloneFilter = <T = string>(filter: MyFilter<T>): MyFilter<T> => {
  return JSON.parse(JSON.stringify(filter)) as MyFilter<T>;
};

/** A copy of the filter to edit; an empty filter gets the default expression, so the editor shows one row. */
export const withDefaultFilterExpression = <T = string>(
  filter: MyFilter<T>,
  defaultExpression: MyFilterExpression<T>,
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  if (nextFilter.items.length === 0) {
    nextFilter.items = [{ ...defaultExpression, id: crypto.randomUUID() }];
  }
  return nextFilter;
};

/** Adds an empty group at the start of the group filterId. */
export const addDefaultFilter = <T = string>(filter: MyFilter<T>, filterId: string): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    const group: MyFilter<T> = { id: crypto.randomUUID(), items: [], logic_operator: LogicalOperator.AND };
    filterItem.items = [group, ...filterItem.items];
  }
  return nextFilter;
};

/** Adds the default expression at the end of the group filterId. */
export const addDefaultFilterExpression = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
  defaultExpression: MyFilterExpression<T>,
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    filterItem.items = [...filterItem.items, { ...defaultExpression, id: crypto.randomUUID() }];
  }
  return nextFilter;
};

export const changeFilterLogicalOperator = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
  operator: LogicalOperator,
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    filterItem.logic_operator = operator;
  }
  return nextFilter;
};

/** Sets the column of an expression and resets its operator and value to the column's defaults. */
export const changeFilterColumn = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
  columnValue: string,
  column2Info: Record<string, ColumnInfo>,
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    // numeric columns are project metadata ids, all others are the table's column names
    filterItem.column = parseInt(columnValue) || (columnValue as T);

    const columnInfo = column2Info[columnValue];
    if (!columnInfo) {
      return nextFilter;
    }

    const filterOperatorType = filterOperator2FilterOperatorType[columnInfo.operator];
    filterItem.operator = getDefaultOperator(filterOperatorType);
    filterItem.value = getDefaultValue(columnInfo.value, columnInfo.operator);
  }
  return nextFilter;
};

export const changeFilterOperator = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
  operator: FilterOperators,
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    filterItem.operator = operator;
  }
  return nextFilter;
};

export const changeFilterValue = <T = string>(
  filter: MyFilter<T>,
  filterId: string,
  value: string | number | boolean | string[],
): MyFilter<T> => {
  const nextFilter = cloneFilter(filter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    filterItem.value = value;
  }
  return nextFilter;
};

/** Converts the sorting state of a table (sort ids are the columns the table was configured with) to backend sorts. */
export const toSorts = <TColumn extends string>(sortingModel: MRT_SortingState) =>
  sortingModel.map((sort) => ({
    column: sort.id as TColumn,
    direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
  }));
