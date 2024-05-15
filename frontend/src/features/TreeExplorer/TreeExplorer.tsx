import { AppBar, Box, BoxProps, Checkbox, Stack, SvgIconProps, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import DataTreeView from "./DataTreeView.tsx";
import { IDataTree } from "./IDataTree.ts";
import { TreeDataFilter } from "./TreeDataFilter.tsx";
import { flatTree } from "./TreeUtils.ts";

interface DataExplorerProps {
  toolbarTitle?: string;
  showCheckboxes?: boolean;
  showFilter?: boolean;
  onDataClick?: (dataId: number) => void;
  selectedDataId?: number | undefined;
  expandedDataIds: string[];
  setExpandedDataIds?: React.Dispatch<React.SetStateAction<string[]>>;
  dataTree: Node<IDataTree>;
  allData: CodeRead[] | DocumentTagRead[];
  dataFilter: string;
  setDataFilter: React.Dispatch<React.SetStateAction<string>>;
  dataType: string;
  handleSelectData?: (event: React.SyntheticEvent, nodeId: string | string[]) => void;
  handleExpandClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  handleCollapseClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  renderActions?: (node: IDataTree) => React.ReactNode;
  renderListActions?: () => React.ReactNode;
  renderFilterActions?: () => React.ReactNode;
  dataIcon: React.ElementType<SvgIconProps>;
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
      setExpandedDataIds,
      dataTree,
      allData,
      dataFilter,
      setDataFilter,
      dataType,
      handleSelectData,
      handleExpandClick,
      handleCollapseClick,
      renderActions,
      renderListActions,
      renderFilterActions,
      dataIcon,
      ...props
    },
    ref,
  ) => {
    const [nodesToExpand, setNodesToExpand] = useState<Set<number>>(new Set());
    const [filteredDataTree, setFilteredDataTree] = useState<Node<IDataTree>>(dataTree);

    // effects
    // automatically expand filtered nodes
    useEffect(() => {
      if (setExpandedDataIds && nodesToExpand)
        setExpandedDataIds(() => Array.from(nodesToExpand).map((id) => id.toString()));
    }, [nodesToExpand, setExpandedDataIds]);

    // checkboxes
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
        {showFilter && (
          <TreeDataFilter
            actions={renderFilterActions && renderFilterActions()}
            allData={allData}
            setNodesToExpand={setNodesToExpand}
            setFilteredDataTree={setFilteredDataTree}
            dataFilter={dataFilter}
            dataTree={dataTree}
            dataType={dataType}
            setDataFilter={setDataFilter}
          />
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
        <DataTreeView
          dataType={dataType}
          dataIcon={dataIcon}
          className="myFlexFillAllContainer"
          // data
          data={filteredDataTree.model}
          // selection
          multiSelect={false}
          disableSelection={!handleSelectData && !selectedDataId}
          selected={selectedDataId?.toString() || ""}
          onNodeSelect={handleSelectData}
          // expand / collapse
          expanded={expandedDataIds}
          onExpandClick={handleExpandClick}
          onCollapseClick={handleCollapseClick}
          onDataClick={onDataClick ? (data) => onDataClick(data.id) : undefined}
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
