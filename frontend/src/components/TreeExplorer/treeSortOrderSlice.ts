import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { RootState } from "../../store/store.ts";

/**
 * Global slice for managing tree sort orders across all projects.
 * Unlike other slices, this one is NOT reset when the project changes,
 * allowing sort orders to be preserved per-project.
 */

interface SortOrderData {
  sortOrder: number[];
}

interface TreeSortOrderState {
  // Store sort orders keyed by: "{projectId}-{storageKey}"
  // e.g., "123-code-sort-order" or "456-tag-sort-order"
  orders: Record<string, SortOrderData>;
}

const initialState: TreeSortOrderState = {
  orders: {},
};

export const treeSortOrderSlice = createSlice({
  name: "treeSortOrder",
  initialState,
  reducers: {
    setTreeSortOrder: (
      state,
      action: PayloadAction<{
        projectId: number;
        storageKey: string;
        sortOrder: number[];
      }>
    ) => {
      const key = `${action.payload.projectId}-${action.payload.storageKey}`;
      state.orders[key] = {
        sortOrder: action.payload.sortOrder,
      };
    },
    clearTreeSortOrder: (
      state,
      action: PayloadAction<{
        projectId: number;
        storageKey: string;
      }>
    ) => {
      const key = `${action.payload.projectId}-${action.payload.storageKey}`;
      delete state.orders[key];
    },
  },
  // Note: No extraReducers with ProjectActions.changeProject
  // This slice should NOT be reset when project changes
});

export const TreeSortOrderActions = treeSortOrderSlice.actions;

// Selector to get sort order for a specific project and storage key
export const selectTreeSortOrder = (projectId: number | undefined, storageKey: string) => (state: RootState) => {
  if (!projectId) return [];
  const key = `${projectId}-${storageKey}`;
  return state.treeSortOrder.orders[key]?.sortOrder || [];
};

export default persistReducer(
  {
    key: "treeSortOrder",
    storage,
  },
  treeSortOrderSlice.reducer,
);
