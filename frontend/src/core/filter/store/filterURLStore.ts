import { LogicalOperator } from "@api/models/LogicalOperator";
import { ColumnInfo, FilterOperators, MyFilter, MyFilterExpression, createEmptyFilter } from "../filterUtils";
import {
  addDefaultFilterExpressionToEditableFilter,
  addDefaultFilterToEditableFilter,
  changeEditableFilterColumn,
  changeEditableFilterLogicalOperator,
  changeEditableFilterOperator,
  changeEditableFilterValue,
  createClearedFilter,
  deleteFilterFromEditableFilter,
  startFilterEdit,
} from "./_utils/filterLogic";

export const FILTER_PARAM = "searchFilter";
export const FILTER_EXPERT_MODE_PARAM = "filterExpertMode";

const isValidFilter = (value: unknown): value is MyFilter => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as MyFilter;
  return typeof candidate.id === "string" && Array.isArray(candidate.items) && Boolean(candidate.logic_operator);
};

const tryParseFilter = (value: string): MyFilter | undefined => {
  try {
    const decoded = decodeURIComponent(value);
    const parsed = JSON.parse(decoded) as unknown;
    return isValidFilter(parsed) ? parsed : undefined;
  } catch {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isValidFilter(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
};

export const serializeFilterToSearchParam = (filter: MyFilter): string => {
  return encodeURIComponent(JSON.stringify(filter));
};

export const deserializeFilterFromSearchParam = <T extends string = string>(
  value: unknown,
  filterName: string,
): MyFilter<T> => {
  if (typeof value !== "string" || value.length === 0) {
    return createEmptyFilter(filterName) as MyFilter<T>;
  }

  const parsed = tryParseFilter(value);
  if (!parsed) {
    return createEmptyFilter(filterName) as MyFilter<T>;
  }

  if (!parsed.id) {
    return {
      ...parsed,
      id: filterName,
    } as MyFilter<T>;
  }

  return parsed as MyFilter<T>;
};

export const withDefaultFilterExpression = <T extends string = string>(
  filter: MyFilter<T>,
  defaultExpression: MyFilterExpression<T>,
): MyFilter<T> => {
  return startFilterEdit(filter, defaultExpression) as MyFilter<T>;
};

export const resetFilter = <T extends string = string>(filter: MyFilter<T>): MyFilter<T> => {
  return createClearedFilter(filter.id) as MyFilter<T>;
};

export const addDefaultFilter = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
): MyFilter<T> => {
  return addDefaultFilterToEditableFilter(editableFilter, filterId) as MyFilter<T>;
};

export const addDefaultFilterExpression = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
  defaultFilterExpression: MyFilterExpression<T>,
): MyFilter<T> => {
  return addDefaultFilterExpressionToEditableFilter(
    editableFilter,
    filterId,
    defaultFilterExpression,
    true,
  ) as MyFilter<T>;
};

export const deleteFilterItem = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
): MyFilter<T> => {
  return deleteFilterFromEditableFilter(editableFilter, filterId) as MyFilter<T>;
};

export const changeFilterLogicalOperator = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
  operator: LogicalOperator,
): MyFilter<T> => {
  return changeEditableFilterLogicalOperator(editableFilter, filterId, operator) as MyFilter<T>;
};

export const changeFilterColumn = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
  columnValue: string,
  column2Info: Record<string, ColumnInfo>,
): MyFilter<T> => {
  return changeEditableFilterColumn(editableFilter, filterId, columnValue, column2Info) as MyFilter<T>;
};

export const changeFilterOperator = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
  operator: FilterOperators,
): MyFilter<T> => {
  return changeEditableFilterOperator(editableFilter, filterId, operator) as MyFilter<T>;
};

export const changeFilterValue = <T extends string = string>(
  editableFilter: MyFilter<T>,
  filterId: string,
  value: string | number | boolean | string[],
): MyFilter<T> => {
  return changeEditableFilterValue(editableFilter, filterId, value) as MyFilter<T>;
};
