import { useAuth } from "@core/auth";
import { UserHooks } from "@core/user";
import { useCallback } from "react";

/**
 * Whether the current user may create annotations as this user: as themselves or as a virtual user of the project,
 * e.g. to build an agreed group standard. The annotations of other users are read-only.
 */
export function useCanAnnotateAs(): (userId: number | undefined) => boolean {
  const { user } = useAuth();
  const users = UserHooks.useGetAllUsers();

  return useCallback(
    (userId) =>
      userId !== undefined && (userId === user?.id || (users.data ?? []).some((u) => u.id === userId && u.is_virtual)),
    [user?.id, users.data],
  );
}
