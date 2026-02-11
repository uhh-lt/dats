import { useCallback, useEffect, useMemo, useState } from "react";

interface TreeSortOrderState {
  projectId: number;
  sortOrder: number[];
}

/**
 * Custom hook to manage tree item sort order in localStorage.
 * Persists sort order per project and filters out deleted items.
 * 
 * @param storageKey - Unique key for localStorage (e.g., 'code-sort-order', 'tag-sort-order')
 * @param projectId - Current project ID
 * @param allItemIds - All valid item IDs currently in the tree
 * @returns Object with sortOrder array and updateSortOrder function
 */
export function useTreeSortOrder(
  storageKey: string,
  projectId: number | undefined,
  allItemIds: number[]
) {
  // Load initial sort order from localStorage
  const loadSortOrder = useCallback((): number[] => {
    if (!projectId) return [];
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];
      
      const data: TreeSortOrderState = JSON.parse(stored);
      
      // Only use stored order if it's for the current project
      if (data.projectId !== projectId) return [];
      
      // Filter out any IDs that no longer exist in allItemIds
      const validIds = data.sortOrder.filter(id => allItemIds.includes(id));
      
      return validIds;
    } catch (error) {
      console.error(`Failed to load ${storageKey}:`, error);
      return [];
    }
  }, [storageKey, projectId, allItemIds]);

  const [sortOrder, setSortOrder] = useState<number[]>(loadSortOrder);

  // Update localStorage when sort order changes
  const saveSortOrder = useCallback((order: number[]) => {
    if (!projectId) return;
    
    try {
      const data: TreeSortOrderState = {
        projectId,
        sortOrder: order,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${storageKey}:`, error);
    }
  }, [storageKey, projectId]);

  // Reload sort order when projectId or allItemIds change
  useEffect(() => {
    const newOrder = loadSortOrder();
    setSortOrder(newOrder);
  }, [storageKey, projectId, allItemIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update sort order and persist to localStorage
  const updateSortOrder = useCallback((newOrder: number[]) => {
    setSortOrder(newOrder);
    saveSortOrder(newOrder);
  }, [saveSortOrder]);

  // Compute the effective sort order with all items
  // Items in sortOrder come first (in that order), followed by remaining items by ID
  const effectiveSortOrder = useMemo(() => {
    // Get items that are in the custom sort order
    const orderedItems = sortOrder.filter(id => allItemIds.includes(id));
    
    // Get items that are not in the custom sort order (newly added items)
    const unorderedItems = allItemIds.filter(id => !sortOrder.includes(id));
    
    // Sort unordered items by ID
    unorderedItems.sort((a, b) => a - b);
    
    // Combine: custom order first, then new items by ID
    return [...orderedItems, ...unorderedItems];
  }, [sortOrder, allItemIds]);

  return {
    sortOrder: effectiveSortOrder,
    updateSortOrder,
  };
}
