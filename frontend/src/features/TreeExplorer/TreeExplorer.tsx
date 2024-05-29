import { AppBar, Box, BoxProps, Checkbox, Stack, SvgIconProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import DataTreeView from "./DataTreeView.tsx";
import { IDataTree } from "./IDataTree.ts";
import { TreeDataFilter } from "./TreeDataFilter.tsx";
import { flatTree } from "./TreeUtils.ts";

interface DataExplorerProps {
  toolbarTitle?: string;
  // data
  allData: CodeRead[] | DocumentTagRead[];
  dataTree: Node<IDataTree>;
  dataIcon: React.ElementType<SvgIconProps>;
  // checkboxes
  showCheckboxes?: boolean;
  // expansion
  expandedDataIds: string[];
  onExpandedDataIdsChange: (newExpandedDataIds: string[]) => void;
  // selection
  selectedDataId?: number | undefined;
  onSelectedDataIdChange?: (event: React.SyntheticEvent, nodeId: string | string[]) => void;
  // filter
  showFilter?: boolean;
  dataFilter: string;
  onDataFilterChange: (newDataFilter: string) => void;
  // actions
  onDataClick?: (dataId: number) => void;
  // render actions
  renderActions?: (node: IDataTree) => React.ReactNode;
  renderListActions?: () => React.ReactNode;
  renderFilterActions?: () => React.ReactNode;
}

export interface TreeDataExplorerHandle {
  getCheckedTreeDataIds: () => number[];
}

const TreeExplorer = forwardRef<TreeDataExplorerHandle, DataExplorerProps & BoxProps>(
  (
    {
      toolbarTitle,
      showCheckboxes,
      showFilter,
      onDataClick,
      selectedDataId,
      expandedDataIds,
      onExpandedDataIdsChange,
      dataTree,
      allData,
      dataFilter,
      onDataFilterChange,
      onSelectedDataIdChange,
      renderActions,
      renderListActions,
      renderFilterActions,
      dataIcon,
      ...props
    },
    ref,
  ) => {
    // filter feature
    const [filteredDataTree, setFilteredDataTree] = useState<Node<IDataTree>>(dataTree);

    // expansion feature
    const [nodesToExpand, setNodesToExpand] = useState<Set<number>>(new Set());
    const expandData = useCallback(
      (dataIdsToExpand: string[]) => {
        const prev = expandedDataIds.slice();
        for (const dataId of dataIdsToExpand) {
          if (prev.indexOf(dataId) === -1) {
            prev.push(dataId);
          }
        }
        onExpandedDataIdsChange(prev);
      },
      [onExpandedDataIdsChange, expandedDataIds],
    );
    // automatically expand filtered nodes
    useEffect(() => {
      if (nodesToExpand) {
        onExpandedDataIdsChange(Array.from(nodesToExpand).map((id) => id.toString()));
      }
    }, [nodesToExpand, onExpandedDataIdsChange]);
    // expand actions
    const handleExpandClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      expandData([nodeId]);
    };
    const handleCollapseClick = (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
      event.stopPropagation();
      const id = expandedDataIds.indexOf(nodeId);
      const newDataIds = [...expandedDataIds];
      newDataIds.splice(id, 1);
      onExpandedDataIdsChange(newDataIds);
    };

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

    // exposed methods (via ref)
    useImperativeHandle(ref, () => ({
      getCheckedTreeDataIds: () => checkedDataIds,
    }));

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
            allData={allData}
            setNodesToExpand={setNodesToExpand}
            setFilteredDataTree={setFilteredDataTree}
            dataFilter={dataFilter}
            dataTree={dataTree}
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
          disableSelection={!onSelectedDataIdChange && !selectedDataId}
          selected={selectedDataId?.toString() || ""}
          onNodeSelect={onSelectedDataIdChange}
          // expand / collapse
          expanded={expandedDataIds}
          onExpandClick={handleExpandClick}
          onCollapseClick={handleCollapseClick}
          // actions
          onDataClick={onDataClick ? (data) => onDataClick(data.id) : undefined}
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
  },
);

export default TreeExplorer;
