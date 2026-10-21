import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { DocumentSearchActions } from "../../../store/documentSearchSlice";
import { DocumentSearchRouteAPI } from "./documentSearchRouteAPI";

/**
 * Whether the folders are shown in the document search. The value is a search param of the route, so that the route loader
 * and the view fetch exactly the same data.
 */
export function useShowFolders() {
  const showFolders = DocumentSearchRouteAPI.useSearch({ select: (search) => search.showFolders });
  const navigate = DocumentSearchRouteAPI.useNavigate();
  const dispatch = useAppDispatch();

  const toggleShowFolders = useCallback(() => {
    navigate({ search: (prev) => ({ ...prev, showFolders: !showFolders }), replace: true });
    if (showFolders) {
      dispatch(DocumentSearchActions.onFoldersHidden());
    }
  }, [dispatch, navigate, showFolders]);

  return [showFolders, toggleShowFolders] as const;
}
