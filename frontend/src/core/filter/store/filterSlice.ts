import { CaseReducerActions, Draft, PayloadAction } from "@reduxjs/toolkit";
import { createEmptyFilter, MyFilter, MyFilterExpression } from "../filterUtils";

export interface FilterState {
  // project state:
  filter: Record<string, MyFilter>;
  defaultFilterExpression: MyFilterExpression;
  // app state:
  expertMode: boolean;
}

export const createInitialFilterState = (defaultFilterExpression: MyFilterExpression): FilterState => {
  return {
    filter: {
      root: createEmptyFilter("root"),
    },
    defaultFilterExpression,
    expertMode: false,
  };
};

export const resetProjectFilterState = ({
  state,
  defaultFilterExpression,
}: {
  state: Draft<FilterState>;
  defaultFilterExpression: MyFilterExpression;
}) => {
  const initialState = createInitialFilterState(defaultFilterExpression);
  state.filter = initialState.filter;
  state.defaultFilterExpression = initialState.defaultFilterExpression;
};

export const filterReducer = {
  onChangeFilterExpertMode: (state: Draft<FilterState>, action: PayloadAction<boolean>) => {
    state.expertMode = action.payload;
  },
  onChangeFilter: (state: Draft<FilterState>, action: PayloadAction<{ filterName: string; filter: MyFilter }>) => {
    state.filter[action.payload.filterName] = action.payload.filter;
  },
};

export type FilterReducer = typeof filterReducer;
export type FilterActions = CaseReducerActions<FilterReducer, string>;
