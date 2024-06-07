import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import {
  ColumnInfo,
  FilterOperators,
  MyFilter,
  MyFilterExpression,
  createEmptyFilter,
  deleteInFilter,
  filterOperator2FilterOperatorType,
  filterOperator2defaultValue,
  findInFilter,
  getDefaultOperator,
  isFilter,
  isFilterExpression,
} from "./filterUtils.ts";

export interface FilterState {
  filter: Record<string, MyFilter>;
  editableFilter: MyFilter;
  defaultFilterExpression: MyFilterExpression;
  column2Info: Record<string, ColumnInfo>;
  expertMode: boolean;
}

export const createInitialFilterState = (defaultFilterExpression: MyFilterExpression): FilterState => {
  return {
    filter: {
      root: {
        id: "root",
        logic_operator: LogicalOperator.AND,
        items: [],
      },
    },
    editableFilter: {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    },
    defaultFilterExpression,
    column2Info: {},
    expertMode: false,
  };
};

export const getOrCreateFilter = (state: FilterState, filterId: string, filter?: MyFilter): MyFilter => {
  if (!state.filter[filterId]) {
    if (filter) {
      state.filter[filterId] = filter;
    } else {
      state.filter[filterId] = createEmptyFilter(filterId);
    }
  }
  return state.filter[filterId];
};

export const filterReducer = {
  onStartFilterEdit: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; filter?: MyFilter }>) => {
    const currentFilter = getOrCreateFilter(state, action.payload.filterId, action.payload.filter);
    state.editableFilter = JSON.parse(JSON.stringify(currentFilter));

    // add a default filter expression if the filter is empty
    if (state.editableFilter.items.length === 0) {
      state.editableFilter.items = [
        {
          ...state.defaultFilterExpression,
          id: uuidv4(),
        } as MyFilterExpression,
      ];
    }
  },
  onFinishFilterEdit: (state: Draft<FilterState>) => {
    state.filter = {
      ...state.filter,
      [state.editableFilter.id]: state.editableFilter,
    };
    state.editableFilter = {
      id: "root",
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  addDefaultFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.items = [
        {
          id: uuidv4(),
          items: [],
          logic_operator: LogicalOperator.AND,
        } as MyFilter,
        ...filterItem.items,
      ];
    }
  },
  addDefaultFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; addEnd?: boolean }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      if (action.payload.addEnd) {
        filterItem.items = [
          ...filterItem.items,
          {
            ...state.defaultFilterExpression,
            id: uuidv4(),
          } as MyFilterExpression,
        ];
      } else {
        filterItem.items = [
          {
            ...state.defaultFilterExpression,
            id: uuidv4(),
          } as MyFilterExpression,
          ...filterItem.items,
        ];
      }
    }
  },
  deleteFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    state.editableFilter = deleteInFilter(state.editableFilter, action.payload.filterId);
  },
  changeLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = action.payload.operator;
    }
  },
  changeColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      if (parseInt(action.payload.columnValue)) {
        // it is a Metadata column: metadata columns are stored as project_metadata.id
        filterItem.column = parseInt(action.payload.columnValue);
      } else {
        // it is a proper Column
        filterItem.column = action.payload.columnValue;
      }

      const filterOperator = state.column2Info[action.payload.columnValue].operator;
      const filterOperatorType = filterOperator2FilterOperatorType[filterOperator];

      filterItem.operator = getDefaultOperator(filterOperatorType);
      filterItem.value = filterOperator2defaultValue[filterOperator];
    }
  },
  changeOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: FilterOperators }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = action.payload.operator;
    }
  },
  changeValue: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; value: string | number | boolean | string[] }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.value = action.payload.value;
    }
  },
  resetEditFilter: (state: Draft<FilterState>) => {
    state.editableFilter = {
      id: state.editableFilter.id,
      logic_operator: LogicalOperator.AND,
      items: [],
    };
  },
  init: (state: Draft<FilterState>, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
    state.column2Info = action.payload.columnInfoMap;
  },
  onChangeExpertMode: (state: Draft<FilterState>, action: PayloadAction<{ expertMode: boolean }>) => {
    state.expertMode = action.payload.expertMode;
  },
};

export type FilterReducer = typeof filterReducer;
export type FilterActions = CaseReducerActions<FilterReducer, string>;
