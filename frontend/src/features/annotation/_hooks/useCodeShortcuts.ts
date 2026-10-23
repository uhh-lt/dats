import { useAuth } from "@core/auth";
import { CodeHooks } from "@core/code";
import { CodeRead } from "@models/CodeRead";
import { useAppSelector } from "@store/storeHooks";
import { useMemo } from "react";
import { CODE_SHORTCUT_KEYS, CodeShortcutBindings, CodeShortcutKey } from "../store/codeShortcutsSlice";

const EMPTY_BINDINGS: CodeShortcutBindings = {};

/**
 * The code shortcuts of the current user in a project, as shortcut key -> code. A binding whose code was deleted or
 * disabled is left out, so the key counts as free (the persisted binding is overwritten on the next assign).
 */
export const useCodeShortcuts = (projectId: number | undefined) => {
  const { user } = useAuth();
  const bindings = useAppSelector((state) =>
    user === undefined || projectId === undefined
      ? EMPTY_BINDINGS
      : (state.codeShortcuts.bindingsByUserAndProject[user.id]?.[projectId] ?? EMPTY_BINDINGS),
  );
  const enabledCodes = CodeHooks.useGetEnabledCodes();

  return useMemo(() => {
    const enabledCodesById = new Map((enabledCodes.data ?? []).map((code) => [code.id, code]));
    const shortcuts: Partial<Record<CodeShortcutKey, CodeRead>> = {};
    for (const shortcutKey of CODE_SHORTCUT_KEYS) {
      const codeId = bindings[shortcutKey];
      const code = codeId === undefined ? undefined : enabledCodesById.get(codeId);
      if (code) {
        shortcuts[shortcutKey] = code;
      }
    }
    return shortcuts;
  }, [bindings, enabledCodes.data]);
};
