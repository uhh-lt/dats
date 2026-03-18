import { LogicalOperator } from "@api/models/LogicalOperator";
import {
  ColumnInfo,
  FilterOperators,
  MyFilter,
  MyFilterExpression,
  deleteInFilter,
  filterOperator2FilterOperatorType,
  findInFilter,
  getDefaultOperator,
  getDefaultValue,
  isFilter,
  isFilterExpression,
} from "../../filterUtils";

export const cloneFilter = <T = string>(filter: MyFilter<T>): MyFilter<T> => {
  return JSON.parse(JSON.stringify(filter)) as MyFilter<T>;
};

export const createClearedFilter = (filterId: string): MyFilter => {
  return {
    id: filterId,
    logic_operator: LogicalOperator.AND,
    items: [],
  };
};

export const startFilterEdit = (sourceFilter: MyFilter, defaultExpression: MyFilterExpression): MyFilter => {
  const nextFilter = cloneFilter(sourceFilter);
  if (nextFilter.items.length === 0) {
    nextFilter.items = [
      {
        ...defaultExpression,
        id: crypto.randomUUID(),
      },
    ];
  }
  return nextFilter;
};

export const finishFilterEdit = (
  currentFilters: Record<string, MyFilter>,
  editableFilter: MyFilter,
): { filter: Record<string, MyFilter>; editableFilter: MyFilter } => {
  return {
    filter: {
      ...currentFilters,
      [editableFilter.id]: editableFilter,
    },
    editableFilter: createClearedFilter("root"),
  };
};

export const addDefaultFilterToEditableFilter = (editableFilter: MyFilter, filterId: string): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    filterItem.items = [
      {
        id: crypto.randomUUID(),
        items: [],
        logic_operator: LogicalOperator.AND,
      } as MyFilter,
      ...filterItem.items,
    ];
  }
  return nextFilter;
};

export const addDefaultFilterExpressionToEditableFilter = (
  editableFilter: MyFilter,
  filterId: string,
  defaultFilterExpression: MyFilterExpression,
  addEnd = true,
): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    const newFilterExpression = {
      ...defaultFilterExpression,
      id: crypto.randomUUID(),
    } as MyFilterExpression;

    if (addEnd) {
      filterItem.items = [...filterItem.items, newFilterExpression];
    } else {
      filterItem.items = [newFilterExpression, ...filterItem.items];
    }
  }
  return nextFilter;
};

export const deleteFilterFromEditableFilter = (editableFilter: MyFilter, filterId: string): MyFilter => {
  return deleteInFilter(editableFilter, filterId);
};

export const changeEditableFilterLogicalOperator = (
  editableFilter: MyFilter,
  filterId: string,
  operator: LogicalOperator,
): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilter(filterItem)) {
    filterItem.logic_operator = operator;
  }
  return nextFilter;
};

export const changeEditableFilterColumn = (
  editableFilter: MyFilter,
  filterId: string,
  columnValue: string,
  column2Info: Record<string, ColumnInfo>,
): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    if (parseInt(columnValue)) {
      filterItem.column = parseInt(columnValue);
    } else {
      filterItem.column = columnValue;
    }

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

export const changeEditableFilterOperator = (
  editableFilter: MyFilter,
  filterId: string,
  operator: FilterOperators,
): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    filterItem.operator = operator;
  }
  return nextFilter;
};

export const changeEditableFilterValue = (
  editableFilter: MyFilter,
  filterId: string,
  value: string | number | boolean | string[],
): MyFilter => {
  const nextFilter = cloneFilter(editableFilter);
  const filterItem = findInFilter(nextFilter, filterId);
  if (filterItem && isFilterExpression(filterItem)) {
    filterItem.value = value;
  }
  return nextFilter;
};
