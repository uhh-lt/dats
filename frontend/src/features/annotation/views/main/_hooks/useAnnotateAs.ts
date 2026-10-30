import { useAuth } from "@core/auth";
import { UserHooks } from "@core/user";
import { useMemo } from "react";

export interface AnnotateAs {
  /** Whether the current user may create annotations as this user: as themselves or as a virtual annotator. */
  canAnnotateAs: (userId: number | undefined) => boolean;
  /** The `annotateAsUserId` of a create request: undefined for the current user, the virtual annotator otherwise. */
  toAnnotateAsUserId: (userId: number | undefined) => number | undefined;
}

/**
 * Humans annotate as themselves or as a virtual annotator of the project, e.g. to build an agreed group standard.
 * The annotations of other humans are read-only.
 */
export function useAnnotateAs(): AnnotateAs {
  const { user } = useAuth();
  const virtualAnnotators = UserHooks.useGetVirtualAnnotators();

  return useMemo(() => {
    const virtualAnnotatorIds = new Set((virtualAnnotators.data ?? []).map((annotator) => annotator.id));
    return {
      canAnnotateAs: (userId) => userId !== undefined && (userId === user?.id || virtualAnnotatorIds.has(userId)),
      toAnnotateAsUserId: (userId) => (userId !== undefined && virtualAnnotatorIds.has(userId) ? userId : undefined),
    };
  }, [user?.id, virtualAnnotators.data]);
}
