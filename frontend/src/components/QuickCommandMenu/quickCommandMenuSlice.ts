import { createSlice } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { RootState } from "../../store/store";
import { generateDefaultCommands } from "./defaultCommands";

interface QuickCommandMenuState {
  isOpen: boolean;
  projectId?: string;
}

const initialState: QuickCommandMenuState = {
  isOpen: false,
  projectId: undefined,
};

const quickCommandMenuSlice = createSlice({
  name: "quickCommandMenu",
  initialState,
  reducers: {
    openMenu: (state) => {
      state.isOpen = true;
    },
    closeMenu: (state) => {
      state.isOpen = false;
    },
    toggleMenu: (state) => {
      state.isOpen = !state.isOpen;
    },
    setProjectId: (state, action) => {
      state.projectId = action.payload;
    },
  },
});

export const { openMenu, closeMenu, toggleMenu, setProjectId } = quickCommandMenuSlice.actions;

// Create a selector to get commands based on current project ID
export const selectAvailableCommands = (state: RootState) => {
  return generateDefaultCommands(state.quickCommandMenu.projectId);
};

export default persistReducer(
  {
    key: "quickCommandMenu",
    storage,
    blacklist: ["isOpen"], // Don't persist the open/closed state
  },
  quickCommandMenuSlice.reducer,
);
