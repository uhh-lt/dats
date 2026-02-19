import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { LogicalOperator } from "../../api/openapi/models/LogicalOperator.ts";
import { QueryKey } from "../../api/QueryKey.ts";
import queryClient from "../../plugins/ReactQueryClient.ts";
import {
  ColumnInfo,
  FilterOperators,
  MyFilter,
  MyFilterExpression,
  createEmptyFilter,
  deleteInFilter,
  filterOperator2FilterOperatorType,
  findInFilter,
  getDefaultOperator,
  getDefaultValue,
  isFilter,
  isFilterExpression,
} from "./filterUtils.ts";

export interface FilterState {
  // project state:
  filter: Record<string, MyFilter>;
  editableFilter: MyFilter;
  defaultFilterExpression: MyFilterExpression;
  // column2info is actually app state. In ideal setting, we would only need to fetch this once, ever.
  // However, we want a reliable "init" action - that is used to populate this state - for other state management reasons.
  // For example, in Search, Sentence Search, Logbook/Memo Search, Annotated Segments, the metadata columns are filtered out automatically during init.
  column2Info: Record<string, ColumnInfo>;
  // app state:
  expertMode: boolean;
}

export const tableInfoQueryKey = (sliceName: string, projectId: number) => [QueryKey.TABLE_INFO, sliceName, projectId];

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

export const resetProjectFilterState = ({
  state,
  defaultFilterExpression,
  projectId,
  sliceName,
}: {
  state: Draft<FilterState>;
  defaultFilterExpression: MyFilterExpression;
  projectId: number | undefined;
  sliceName: string;
}) => {
  const initialState = createInitialFilterState(defaultFilterExpression);
  state.filter = initialState.filter;
  state.editableFilter = initialState.editableFilter;
  state.defaultFilterExpression = initialState.defaultFilterExpression;
  // reset column info
  state.column2Info = initialState.column2Info;
  if (projectId) {
    queryClient.removeQueries({ queryKey: tableInfoQueryKey(sliceName, projectId) });
  }
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
    const currentFilter = JSON.parse(
      JSON.stringify(getOrCreateFilter(state, action.payload.filterId, action.payload.filter)),
    );

    // add a default filter expression if the filter is empty
    if (currentFilter.items.length === 0) {
      currentFilter.items = [
        {
          ...state.defaultFilterExpression,
          id: uuidv4(),
        },
      ];
    }

    state.editableFilter = currentFilter;
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
  changeFilterLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilter(filterItem)) {
      filterItem.logic_operator = action.payload.operator;
    }
  },
  changeFilterColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      if (parseInt(action.payload.columnValue)) {
        // it is a Metadata column: metadata columns are stored as project_metadata.id
        filterItem.column = parseInt(action.payload.columnValue);
      } else {
        // it is a proper Column
        filterItem.column = action.payload.columnValue;
      }

      const columnInfo = state.column2Info[action.payload.columnValue];
      const filterOperatorType = filterOperator2FilterOperatorType[columnInfo.operator];

      filterItem.operator = getDefaultOperator(filterOperatorType);
      filterItem.value = getDefaultValue(columnInfo.value, columnInfo.operator);
    }
  },
  changeFilterOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: FilterOperators }>,
  ) => {
    const filterItem = findInFilter(state.editableFilter, action.payload.filterId);
    if (filterItem && isFilterExpression(filterItem)) {
      filterItem.operator = action.payload.operator;
    }
  },
  changeFilterValue: (
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
  onChangeFilterExpertMode: (state: Draft<FilterState>, action: PayloadAction<{ expertMode: boolean }>) => {
    state.expertMode = action.payload.expertMode;
  },
  setFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterName: string; filter: MyFilter }>) => {
    state.filter[action.payload.filterName] = action.payload.filter;
  },
};

export type FilterReducer = typeof filterReducer;
export type FilterActions = CaseReducerActions<FilterReducer, string>;
