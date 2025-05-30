import { AppBar, Box, BoxProps, Checkbox, Stack, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Node } from "ts-tree-structure";
import DataTreeView, { DataTreeViewProps } from "./DataTreeView.tsx";
import { IDataTree } from "./IDataTree.ts";
import TreeDataFilter from "./TreeDataFilter.tsx";
import { filterTree, flatTree } from "./TreeUtils.ts";

export interface TreeExplorerProps extends Omit<DataTreeViewProps, "data"> {
  dataTree: Node<IDataTree>;
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
}

function TreeExplorer({
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
  ...props
}: TreeExplorerProps & BoxProps) {
  // filter feature
  const { dataTree: filteredDataTree, nodesToExpand } = useMemo(
    () =>
      filterTree({
        dataTree: dataTree,
        dataFilter: dataFilter,
      }),
    [dataTree, dataFilter],
  );

  useEffect(() => {
    if (dataFilter.trim().length > 0) {
      onExpandedItemsChange(Array.from(nodesToExpand).map((id) => id.toString()));
    }
  }, [nodesToExpand, dataFilter, onExpandedItemsChange]);

  // checkboxes feature
  const [checkedDataIds, setCheckedDataIds] = useState<number[]>([]);
  const handleCheckboxChange = useCallback((event: React.ChangeEvent<HTMLInputElement>, node: IDataTree) => {
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
    (node: IDataTree): boolean => {
      // a node is checked if it's id as well as all of its children are in the checkedTagIds array
      return checkedDataIds.indexOf(node.data.id) !== -1 && (node.children?.every(isChecked) || true);
    },
    [checkedDataIds],
  );
  const isIndeterminate = useCallback(
    (node: IDataTree) => {
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
    (node: IDataTree) => (
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
      <DataTreeView
        dataIcon={dataIcon}
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
      />
    </Box>
  );
}

export default TreeExplorer;
