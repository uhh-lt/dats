import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../plugins/ReduxHooks.ts";
import { TreeSortOrderActions, selectTreeSortOrder } from "../components/TreeExplorer/treeSortOrderSlice.ts";

/**
 * Custom hook to manage tree item sort order using Redux Toolkit.
 * Persists sort order per project and filters out deleted items.
 * 
 * @param storageKey - Unique key for the sort order (e.g., 'code-sort-order', 'tag-sort-order')
 * @param projectId - Current project ID
 * @param allItemIds - All valid item IDs currently in the tree
 * @returns Object with sortOrder array and updateSortOrder function
 */
export function useTreeSortOrder(
  storageKey: string,
  projectId: number | undefined,
  allItemIds: number[]
) {
  const dispatch = useAppDispatch();
  
  // Get sort order from Redux store
  const storedSortOrder = useAppSelector(selectTreeSortOrder(projectId, storageKey));

  // Filter out any IDs that no longer exist in allItemIds
  const validSortOrder = useMemo(() => {
    return storedSortOrder.filter(id => allItemIds.includes(id));
  }, [storedSortOrder, allItemIds]);

  // Update sort order and persist to Redux store
  const updateSortOrder = useCallback((newOrder: number[]) => {
    if (!projectId) return;
    
    dispatch(TreeSortOrderActions.setTreeSortOrder({
      projectId,
      storageKey,
      sortOrder: newOrder,
    }));
  }, [dispatch, projectId, storageKey]);

  // Compute the effective sort order with all items
  // Items in sortOrder come first (in that order), followed by remaining items by ID
  const effectiveSortOrder = useMemo(() => {
    // Get items that are in the custom sort order
    const orderedItems = validSortOrder.filter(id => allItemIds.includes(id));
    
    // Get items that are not in the custom sort order (newly added items)
    const unorderedItems = allItemIds.filter(id => !validSortOrder.includes(id));
    
    // Sort unordered items by ID
    unorderedItems.sort((a, b) => a - b);
    
    // Combine: custom order first, then new items by ID
    return [...orderedItems, ...unorderedItems];
  }, [validSortOrder, allItemIds]);

  return {
    sortOrder: effectiveSortOrder,
    updateSortOrder,
  };
}

