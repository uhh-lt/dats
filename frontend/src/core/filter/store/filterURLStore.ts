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
  startFilterEdit
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

export const deserializeFilterFromSearchParam = (value: unknown, filterName: string): MyFilter => {
  if (typeof value !== "string" || value.length === 0) {
    return createEmptyFilter(filterName);
  }

  const parsed = tryParseFilter(value);
  if (!parsed) {
    return createEmptyFilter(filterName);
  }

  if (!parsed.id) {
    return {
      ...parsed,
      id: filterName,
    };
  }

  return parsed;
};

export const withDefaultFilterExpression = (filter: MyFilter, defaultExpression: MyFilterExpression): MyFilter => {
  return startFilterEdit(filter, defaultExpression);
};

export const resetFilter = (filter: MyFilter): MyFilter => {
  return createClearedFilter(filter.id);
};

export const addDefaultFilter = (editableFilter: MyFilter, filterId: string): MyFilter => {
  return addDefaultFilterToEditableFilter(editableFilter, filterId);
};

export const addDefaultFilterExpression = (
  editableFilter: MyFilter,
  filterId: string,
  defaultFilterExpression: MyFilterExpression,
): MyFilter => {
  return addDefaultFilterExpressionToEditableFilter(editableFilter, filterId, defaultFilterExpression, true);
};

export const deleteFilterItem = (editableFilter: MyFilter, filterId: string): MyFilter => {
  return deleteFilterFromEditableFilter(editableFilter, filterId);
};

export const changeFilterLogicalOperator = (
  editableFilter: MyFilter,
  filterId: string,
  operator: LogicalOperator,
): MyFilter => {
  return changeEditableFilterLogicalOperator(editableFilter, filterId, operator);
};

export const changeFilterColumn = (
  editableFilter: MyFilter,
  filterId: string,
  columnValue: string,
  column2Info: Record<string, ColumnInfo>,
): MyFilter => {
  return changeEditableFilterColumn(editableFilter, filterId, columnValue, column2Info);
};

export const changeFilterOperator = (
  editableFilter: MyFilter,
  filterId: string,
  operator: FilterOperators,
): MyFilter => {
  return changeEditableFilterOperator(editableFilter, filterId, operator);
};

export const changeFilterValue = (
  editableFilter: MyFilter,
  filterId: string,
  value: string | number | boolean | string[],
): MyFilter => {
  return changeEditableFilterValue(editableFilter, filterId, value);
};
