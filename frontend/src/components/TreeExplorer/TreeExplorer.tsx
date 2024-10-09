import { AppBar, Box, BoxProps, Checkbox, Stack, SvgIconProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Node } from "ts-tree-structure";
import DataTreeView from "./DataTreeView.tsx";
import { IDataTree } from "./IDataTree.ts";
import { TreeDataFilter } from "./TreeDataFilter.tsx";
import { filterTree, flatTree } from "./TreeUtils.ts";

interface DataExplorerProps {
  toolbarTitle?: string;
  // data
  dataTree: Node<IDataTree>;
  dataIcon: React.ElementType<SvgIconProps>;
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
  // render actions
  renderActions?: (node: IDataTree) => React.ReactNode;
  renderListActions?: () => React.ReactNode;
  renderFilterActions?: () => React.ReactNode;
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
  renderActions,
  renderListActions,
  renderFilterActions,
  dataIcon,
  ...props
}: DataExplorerProps & BoxProps) {
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

  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>, node: IDataTree) => {
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
  };

  const isChecked = (node: IDataTree): boolean => {
    // a node is checked if it's id as well as all of its children are in the checkedTagIds array
    return checkedDataIds.indexOf(node.data.id) !== -1 && (node.children?.every(isChecked) || true);
  };

  const isIndeterminate = (node: IDataTree) => {
    if (!node.children) {
      return false;
    }
    const numCheckedChildren = node.children.filter(isChecked).length + (isChecked(node) ? 1 : 0);
    return numCheckedChildren > 0 && numCheckedChildren < node.children.length + 1;
  };

  return (
    <Box className="h100 myFlexContainer" {...props}>
      {toolbarTitle && (
        <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
          <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
            <Typography variant="h6" color="inherit" component="div">
              {toolbarTitle}
            </Typography>
          </Toolbar>
        </AppBar>
      )}
      {renderListActions && (
        <Stack
          direction="row"
          className="myFlexFitContentContainer"
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            alignItems: "center",
          }}
        >
          {renderListActions()}
        </Stack>
      )}
      {showFilter && (
        <TreeDataFilter
          actions={renderFilterActions && renderFilterActions()}
          dataFilter={dataFilter}
          onDataFilterChange={onDataFilterChange}
        />
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
        // render actions
        renderActions={(node) => (
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
        )}
      />
    </Box>
  );
}

export default TreeExplorer;
