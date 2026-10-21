import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "@store/store";
import { persistReducer } from "redux-persist";
import { persistStorage } from "@store/persistStorage";

export type CodeShortcutKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

export const CODE_SHORTCUT_KEYS: CodeShortcutKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export type CodeShortcutBindings = Partial<Record<CodeShortcutKey, number>>;

interface CodeShortcutsState {
  bindingsByUserAndProject: Record<string, Record<string, CodeShortcutBindings>>;
}

interface CodeShortcutScope {
  userId: number;
  projectId: number;
}

interface AssignCodeShortcutPayload extends CodeShortcutScope {
  key: CodeShortcutKey;
  codeId: number;
}

interface ClearCodeShortcutPayload extends CodeShortcutScope {
  key: CodeShortcutKey;
}

interface ReconcileCodeShortcutsPayload extends CodeShortcutScope {
  validCodeIds: number[];
}

const initialState: CodeShortcutsState = {
  bindingsByUserAndProject: {},
};

const codeShortcutsSlice = createSlice({
  name: "codeShortcuts",
  initialState,
  reducers: {
    assign: (state, action: PayloadAction<AssignCodeShortcutPayload>) => {
      const { userId, projectId, key, codeId } = action.payload;
      const userBindings = (state.bindingsByUserAndProject[userId] ??= {});
      const projectBindings = (userBindings[projectId] ??= {});

      for (const shortcutKey of CODE_SHORTCUT_KEYS) {
        if (projectBindings[shortcutKey] === codeId) {
          delete projectBindings[shortcutKey];
        }
      }

      projectBindings[key] = codeId;
    },
    clear: (state, action: PayloadAction<ClearCodeShortcutPayload>) => {
      const { userId, projectId, key } = action.payload;
      const projectBindings = state.bindingsByUserAndProject[userId]?.[projectId];
      if (!projectBindings) {
        return;
      }

      delete projectBindings[key];
    },
    clearAll: (state, action: PayloadAction<CodeShortcutScope>) => {
      const { userId, projectId } = action.payload;
      const userBindings = state.bindingsByUserAndProject[userId];
      if (!userBindings) {
        return;
      }

      delete userBindings[projectId];
    },
    reconcile: (state, action: PayloadAction<ReconcileCodeShortcutsPayload>) => {
      const { userId, projectId, validCodeIds } = action.payload;
      const projectBindings = state.bindingsByUserAndProject[userId]?.[projectId];
      if (!projectBindings) {
        return;
      }

      for (const shortcutKey of CODE_SHORTCUT_KEYS) {
        const codeId = projectBindings[shortcutKey];
        if (codeId !== undefined && !validCodeIds.includes(codeId)) {
          delete projectBindings[shortcutKey];
        }
      }
    },
  },
});

export const CodeShortcutsActions = codeShortcutsSlice.actions;

const EMPTY_BINDINGS: CodeShortcutBindings = {};

export const selectCodeShortcuts = (state: RootState, userId: number | undefined, projectId: number | undefined) => {
  if (userId === undefined || projectId === undefined) {
    return EMPTY_BINDINGS;
  }

  return state.codeShortcuts.bindingsByUserAndProject[userId]?.[projectId] ?? EMPTY_BINDINGS;
};

export const codeShortcutsReducer = {
  [codeShortcutsSlice.name]: persistReducer(
    {
      key: codeShortcutsSlice.name,
      storage: persistStorage,
    },
    codeShortcutsSlice.reducer,
  ),
};
