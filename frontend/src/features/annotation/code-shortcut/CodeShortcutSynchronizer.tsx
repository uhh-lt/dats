import { CodeHooks } from "@api/hooks/CodeHooks";
import { useAuth } from "@core/auth";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useEffect } from "react";
import { CodeShortcutActions } from "../store/codeShortcutSlice";

interface CodeShortcutSynchronizerProps {
  projectId: number;
}

export function CodeShortcutSynchronizer({ projectId }: CodeShortcutSynchronizerProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const currentProjectId = useAppSelector((state) => state.project.projectId);
  const codes = CodeHooks.useGetEnabledCodes();

  useEffect(() => {
    if (!user || !codes.isSuccess || currentProjectId !== projectId) {
      return;
    }

    dispatch(
      CodeShortcutActions.reconcile({
        userId: user.id,
        projectId,
        validCodeIds: codes.data.map((code) => code.id),
      }),
    );
  }, [codes.data, codes.isSuccess, currentProjectId, dispatch, projectId, user]);

  return null;
}
