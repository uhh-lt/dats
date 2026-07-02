import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
import { ColumnInfo, MyFilter, MyFilterExpression } from "../filterUtils";
import { createClearedFilter } from "./_utils/filterLogic";

export interface FilterState {
  // project state:
  filter: Record<string, MyFilter>;
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
  state.defaultFilterExpression = initialState.defaultFilterExpression;
  // reset column info
  state.column2Info = initialState.column2Info;
  if (projectId) {
    queryClient.removeQueries({ queryKey: tableInfoQueryKey(sliceName, projectId) });
  }
};

export const filterReducer = {
  init: (state: Draft<FilterState>, action: PayloadAction<{ columnInfoMap: Record<string, ColumnInfo> }>) => {
    state.column2Info = action.payload.columnInfoMap;
  },
  onChangeFilterExpertMode: (state: Draft<FilterState>, action: PayloadAction<boolean>) => {
    state.expertMode = action.payload;
  },
  onChangeFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterName: string; filter: MyFilter }>) => {
    state.filter[action.payload.filterName] = action.payload.filter;
  },
};

export type FilterReducer = typeof filterReducer;
export type FilterActions = CaseReducerActions<FilterReducer, string>;
