import FolderIcon from "@mui/icons-material/Folder";
import { AppBar, Box, BoxProps, Checkbox, Stack, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Tree, { Node } from "ts-tree-structure";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import DataTreeView, { DataTreeViewProps } from "./DataTreeView.tsx";
import { ITree, NamedObjWithParent } from "./ITree.ts";
import TreeDataFilter from "./TreeDataFilter.tsx";
import { filterTree, flatTree, sortTreeByCustomOrder } from "./TreeUtils.ts";

export interface TreeExplorerProps<T extends NamedObjWithParent> extends Omit<DataTreeViewProps<T>, "data"> {
  dataTree: Node<ITree<T>>;
  toolbarTitle?: string;
  // checkboxes
  showCheckboxes?: boolean;
  // expansion
  expandedItems: string[];
  onExpandedItemsChange: (newExpandedDataIds: string[]) => void;
  // selection
  selectedItems?: number | undefined;
  onSelectedItemsChange?: (event: React.SyntheticEvent, itemIds: string | string[] | null) => void;
  // filter
  showFilter?: boolean;
  dataFilter: string;
  onDataFilterChange: (newDataFilter: string) => void;
  // actions
  onItemClick?: (event: React.MouseEvent, itemId: string) => void;
  // components
  listActions?: React.ReactNode;
  filterActions?: React.ReactNode;
  // dnd
  droppable?: boolean | ((node: ITree<T>) => boolean);
  droppableId?: (node: ITree<T>) => string;
  // custom sort order
  sortOrder?: number[];
  onSortOrderChange?: (newSortOrder: number[]) => void;
  draggableItems?: boolean;
}

function TreeExplorer<T extends NamedObjWithParent>({
  toolbarTitle,
  showCheckboxes,
  showFilter,
  onItemClick,
  selectedItems,
  expandedItems,
  onExpandedItemsChange,
  dataTree,
  dataFilter,
  onDataFilterChange,
  onSelectedItemsChange,
  renderNode,
  renderActions,
  listActions = undefined,
  filterActions = undefined,
  dataIcon,
  parentIcon = FolderIcon,
  rootIcon = FolderIcon,
  renderRoot = false,
  disableRootActions = false,
  droppable,
  droppableId,
  sortOrder,
  onSortOrderChange,
  draggableItems = false,
  ...props
}: TreeExplorerProps<T> & BoxProps) {
  // apply custom sort order if provided
  const sortedDataTree = useMemo(() => {
    if (!sortOrder || sortOrder.length === 0) {
      return dataTree;
    }
    
    // Apply sorting to the tree model
    const sortedModel = sortTreeByCustomOrder(dataTree.model, sortOrder);
    
    // Create a new tree with the sorted model
    const tree = new Tree();
    const newTree = tree.parse<ITree<T>>(sortedModel);
    return newTree;
  }, [dataTree, sortOrder]);

  // filter feature
  const { dataTree: filteredDataTree, nodesToExpand } = useMemo(
    () =>
      filterTree({
        dataTree: sortedDataTree,
        dataFilter: dataFilter,
      }),
    [sortedDataTree, dataFilter],
  );

  useEffect(() => {
    if (dataFilter.trim().length > 0) {
      onExpandedItemsChange(Array.from(nodesToExpand).map((id) => id.toString()));
    }
  }, [nodesToExpand, dataFilter, onExpandedItemsChange]);

  // checkboxes feature
  const [checkedDataIds, setCheckedDataIds] = useState<number[]>([]);
  const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, node: ITree<T>) => {
    event.stopPropagation();
    // get ids of the data and all its children
    const dataIds = [node.data.id];
    if (node.children) {
      dataIds.push(...flatTree(node).map((c) => c.id));
    }
    // toggle the tag ids
    setCheckedDataIds((prevCheckedDataIds) => {
      if (prevCheckedDataIds.includes(node.data.id)) {
        // remove all tagIds
        return prevCheckedDataIds.filter((id) => !dataIds.includes(id));
      } else {
        // add all tagIds (that are not already present)
        return [...prevCheckedDataIds, ...dataIds.filter((id) => !prevCheckedDataIds.includes(id))];
      }
    });
  }, []);
  const isChecked = useCallback(
    (node: ITree<T>): boolean => {
      // a node is checked if it's id as well as all of its children are in the checkedTagIds array
      return checkedDataIds.indexOf(node.data.id) !== -1 && (node.children?.every(isChecked) || true);
    },
    [checkedDataIds],
  );
  const isIndeterminate = useCallback(
    (node: ITree<T>) => {
      if (!node.children) {
        return false;
      }
      const numCheckedChildren = node.children.filter(isChecked).length + (isChecked(node) ? 1 : 0);
      return numCheckedChildren > 0 && numCheckedChildren < node.children.length + 1;
    },
    [isChecked],
  );

  // rendering
  const wrapppedRenderActions = useCallback(
    (node: ITree<T>) => (
      <>
        {showCheckboxes && (
          <Checkbox
            key={node.data.id}
            checked={isChecked(node)}
            indeterminate={isIndeterminate(node)}
            onChange={(event) => handleCheckboxChange(event, node)}
          />
        )}
        {renderActions && renderActions(node)}
      </>
    ),
    [handleCheckboxChange, isChecked, isIndeterminate, renderActions, showCheckboxes],
  );

  // drag and drop for reordering
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Memoize flat data to avoid recalculating on every drag
  const flatData = useMemo(() => {
    return flatTree(sortedDataTree.model);
  }, [sortedDataTree]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      
      if (!active || !over || !onSortOrderChange) return;
      
      // Validate drag data structure
      const activeData = active.data.current;
      const overData = over.data.current;
      
      if (!activeData || !overData) return;
      if (typeof activeData !== "object" || typeof overData !== "object") return;
      if (!("type" in activeData) || !("id" in activeData)) return;
      if (!("type" in overData) || !("id" in overData)) return;
      
      // Only handle tree-item reordering
      if (activeData.type !== "tree-item" || overData.type !== "tree-item") return;
      
      const draggedId = activeData.id as number;
      const targetId = overData.id as number;
      const draggedParentId = ("parentId" in activeData ? activeData.parentId : undefined) as number | null | undefined;
      const targetParentId = ("parentId" in overData ? overData.parentId : undefined) as number | null | undefined;
      
      if (draggedId === targetId) return;
      
      // Only allow reordering items with the same parent
      if (draggedParentId !== targetParentId) return;
      
      // Get all items with the same parent
      const siblingIds = flatData
        .filter((item) => item.parent_id === draggedParentId)
        .map((item) => item.id);
      
      // Get current order: use sortOrder if available, otherwise sort by ID
      // Include all siblings even if they're not in sortOrder yet
      let currentOrder: number[];
      if (sortOrder && sortOrder.length > 0) {
        // Start with items from sortOrder that are siblings
        const orderedSiblings = sortOrder.filter(id => siblingIds.includes(id));
        // Add any siblings not in sortOrder (newly added items)
        const newSiblings = siblingIds.filter(id => !sortOrder.includes(id));
        newSiblings.sort((a, b) => a - b);
        currentOrder = [...orderedSiblings, ...newSiblings];
      } else {
        currentOrder = [...siblingIds].sort((a, b) => a - b);
      }
      
      // Remove dragged item and insert at new position
      const draggedIndex = currentOrder.indexOf(draggedId);
      const targetIndex = currentOrder.indexOf(targetId);
      
      if (draggedIndex === -1 || targetIndex === -1) return;
      
      const newOrder = [...currentOrder];
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedId);
      
      // Merge with other items not in the same parent
      const otherIds = flatData
        .filter((item) => item.parent_id !== draggedParentId)
        .map((item) => item.id);
      
      // Combine the reordered siblings with other items
      const finalOrder = [...newOrder, ...otherIds];
      
      onSortOrderChange(finalOrder);
    },
    [flatData, sortOrder, onSortOrderChange]
  );

  const treeViewContent = (
    <DataTreeView
      className="myFlexFillAllContainer"
      // data
      data={filteredDataTree.model}
      // selection
      multiSelect={false}
      disableSelection={!onSelectedItemsChange && !selectedItems}
      selectedItems={selectedItems?.toString() || ""}
      onSelectedItemsChange={onSelectedItemsChange}
      // expand / collapse
      expandedItems={expandedItems}
      onExpandedItemsChange={(event, itemIds) => {
        event.stopPropagation();
        onExpandedItemsChange(itemIds);
      }}
      // actions
      onItemClick={onItemClick}
      // renderers
      renderActions={wrapppedRenderActions}
      renderNode={renderNode}
      // root node rendering
      renderRoot={renderRoot}
      disableRootActions={disableRootActions}
      // icons
      rootIcon={rootIcon}
      parentIcon={parentIcon}
      dataIcon={dataIcon}
      // dnd
      droppable={droppable}
      droppableId={droppableId}
      draggable={draggableItems}
    />
  );

  return (
    <Box className="h100 myFlexContainer" {...props}>
      {toolbarTitle && (
        <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
          <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
            <Typography variant="h6" component="div">
              {toolbarTitle}
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      {listActions !== undefined && (
        <Stack
          direction="row"
          className="myFlexFitContentContainer"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            alignItems: "center",
          }}
        >
          {listActions}
        </Stack>
      )}
      {showFilter && (
        <TreeDataFilter dataFilter={dataFilter} onDataFilterChange={onDataFilterChange}>
          {filterActions}
        </TreeDataFilter>
      )}
      {draggableItems ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {treeViewContent}
        </DndContext>
      ) : (
        treeViewContent
      )}
    </Box>
  );
}

export default TreeExplorer;
