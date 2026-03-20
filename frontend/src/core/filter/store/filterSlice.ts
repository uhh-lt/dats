import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
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
  finishFilterEdit,
  startFilterEdit,
} from "./_utils/filterLogic";
import { LogicalOperator } from "@api/models/LogicalOperator";

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
      root: createClearedFilter("root"),
    },
    editableFilter: createClearedFilter("root"),
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
    const currentFilter = getOrCreateFilter(state, action.payload.filterId, action.payload.filter);
    state.editableFilter = startFilterEdit(currentFilter, state.defaultFilterExpression);
  },
  onFinishFilterEdit: (state: Draft<FilterState>) => {
    const result = finishFilterEdit(state.filter, state.editableFilter);
    state.filter = result.filter;
    state.editableFilter = result.editableFilter;
  },
  addDefaultFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    state.editableFilter = addDefaultFilterToEditableFilter(state.editableFilter, action.payload.filterId);
  },
  addDefaultFilterExpression: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; addEnd?: boolean }>,
  ) => {
    state.editableFilter = addDefaultFilterExpressionToEditableFilter(
      state.editableFilter,
      action.payload.filterId,
      state.defaultFilterExpression,
      action.payload.addEnd,
    );
  },
  deleteFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string }>) => {
    state.editableFilter = deleteFilterFromEditableFilter(state.editableFilter, action.payload.filterId);
  },
  changeFilterLogicalOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: LogicalOperator }>,
  ) => {
    state.editableFilter = changeEditableFilterLogicalOperator(
      state.editableFilter,
      action.payload.filterId,
      action.payload.operator,
    );
  },
  changeFilterColumn: (state: Draft<FilterState>, action: PayloadAction<{ filterId: string; columnValue: string }>) => {
    state.editableFilter = changeEditableFilterColumn(
      state.editableFilter,
      action.payload.filterId,
      action.payload.columnValue,
      state.column2Info,
    );
  },
  changeFilterOperator: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; operator: FilterOperators }>,
  ) => {
    state.editableFilter = changeEditableFilterOperator(
      state.editableFilter,
      action.payload.filterId,
      action.payload.operator,
    );
  },
  changeFilterValue: (
    state: Draft<FilterState>,
    action: PayloadAction<{ filterId: string; value: string | number | boolean | string[] }>,
  ) => {
    state.editableFilter = changeEditableFilterValue(
      state.editableFilter,
      action.payload.filterId,
      action.payload.value,
    );
  },
  resetEditFilter: (state: Draft<FilterState>) => {
    state.editableFilter = createClearedFilter(state.editableFilter.id);
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
