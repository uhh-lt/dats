import { AppBar, Box, BoxProps, Checkbox, List, Stack, SvgIconTypeMap, Toolbar } from "@mui/material";
import Typography from "@mui/material/Typography";
import * as React from "react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { AttachedObjectType, CodeRead, DocumentTagRead } from "../../api/openapi";
import { useAuth } from "../../auth/AuthProvider";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";
import ExporterButton from "../Exporter/ExporterButton";
import MemoButton from "../Memo/MemoButton";

import { flatTree } from "./TreeUtils";

import { KEYWORD_TAGS } from "../../utils/GlobalConstants";
import { IDataTree } from "./IDataTree";
import { UseQueryResult } from "@tanstack/react-query";
import DataTreeView from "./DataTreeView";
import { Node } from "ts-tree-structure";
import DataEditButton from "./DataEditButton";
import TreeDataEditDialog from "../CrudDialog/TreeData/TreeDataEditDialog";
import DataExplorerContextMenu from "./DataExplorerContextMenu";
import DataTreeMenuCreateButton from "../../views/search/ToolBar/ToolBarElements/TreeDataMenu/TreeDataMenuCreateButton";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import MemoDialog from "../Memo/MemoDialog";
import { TreeDataFilter } from "./TreeDataFilter";
import ExporterDialog from "../Exporter/ExporterDialog";

interface DataExplorerProps {
  showToolbar?: boolean;
  showCheckboxes?: boolean;
  showButtons?: boolean;
  onDataClick?: (dataId: number) => void;
  selectedDataId: number | undefined;
  setSelectedDataId?: React.Dispatch<React.SetStateAction<number | undefined>>;
  expandedDataIds: string[];
  setExpandedDataIds?: React.Dispatch<React.SetStateAction<string[]>>;
  dataTree: Node<IDataTree>;
  allData: UseQueryResult<CodeRead[] | DocumentTagRead[], Error>;
  dataFilter: string;
  setDataFilter: React.Dispatch<React.SetStateAction<string>>;
  dataType: string;
  handleSelectData: (event: React.SyntheticEvent, nodeId: string | string[]) => void;
  handleExpandClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  handleCollapseClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  renderActions?: (node: IDataTree) => React.ReactNode;
  renderFilterActions?: () => React.ReactNode;
  dataIcon: OverridableComponent<SvgIconTypeMap<{}, "svg">> & {
    muiName: string;
  };
}

export interface TreeDataExplorerHandle {
  getCheckedTreeDataIds: () => number[];
}

const TreeExplorer = forwardRef<TreeDataExplorerHandle, DataExplorerProps & BoxProps>(
  (
    {
      showToolbar,
      showCheckboxes,
      showButtons,
      onDataClick,
      selectedDataId,
      setSelectedDataId,
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
      renderFilterActions,
      dataIcon,
      ...props
    },
    ref,
  ) => {
    const { user } = useAuth();
    const [nodesToExpand, setNodesToExpand] = useState<Set<number>>();
    const [filteredDataTree, setFilteredDataTree] = useState<Node<IDataTree>>();

    // effects
    // automatically expand filtered nodes
    React.useEffect(() => {
      if (setExpandedDataIds && nodesToExpand)
        setExpandedDataIds(() => Array.from(nodesToExpand as Set<number>).map((id) => id.toString()));
    }, [nodesToExpand, setExpandedDataIds]);

    // context menu
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
    const [contextMenuData, setContextMenuData] = useState<IDataTree>();
    const onContextMenu = (node: IDataTree) => (event: any) => {
      event.preventDefault();
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuData(node);
    };

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

    const content = (
      <>
        {user && allData.isSuccess && filteredDataTree ? (
          <>
            <DataTreeView
              dataType={dataType}
              dataIcon={dataIcon}
              className="myFlexFillAllContainer"
              data={filteredDataTree.model}
              multiSelect={false}
              selected={selectedDataId?.toString() || ""}
              expanded={expandedDataIds}
              onNodeSelect={handleSelectData}
              onExpandClick={handleExpandClick}
              onCollapseClick={handleCollapseClick}
              onDataClick={onDataClick ? (data) => onDataClick(data.id) : undefined}
              renderActions={(node) => (
                <React.Fragment>
                  {renderActions && renderActions(node)}
                  {showCheckboxes ? (
                    <Checkbox
                      key={node.data.id}
                      checked={isChecked(node)}
                      indeterminate={isIndeterminate(node)}
                      onChange={(event) => handleCheckboxChange(event, node)}
                    />
                  ) : (
                    <>
                      <DataEditButton data={node.data} />
                      <MemoButton
                        attachedObjectId={node.data.id}
                        attachedObjectType={
                          dataType === KEYWORD_TAGS ? AttachedObjectType.DOCUMENT_TAG : AttachedObjectType.CODE
                        }
                      />
                    </>
                  )}
                </React.Fragment>
              )}
              openContextMenu={onContextMenu}
            />
            <TreeDataEditDialog treeData={allData.data} dataType={dataType} />
            <DataExplorerContextMenu
              node={contextMenuData}
              position={contextMenuPosition}
              handleClose={() => setContextMenuPosition(null)}
              dataType={dataType}
            />
            <MemoDialog />
            <ExporterDialog />
          </>
        ) : allData.isError ? (
          <>{allData.error.message}</>
        ) : (
          "Loading..."
        )}
      </>
    );

    return (
      <Box className="h100 myFlexContainer" {...props}>
        {showToolbar && (
          <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
            <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
              <Typography variant="h6" color="inherit" component="div">
                {(dataType === KEYWORD_TAGS ? "Tag" : "Code") + "Explorer"}
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        {showButtons && (
          <>
            <TreeDataFilter
              actions={renderFilterActions && renderFilterActions()}
              allData={allData}
              setNodesToExpand={setNodesToExpand as React.Dispatch<React.SetStateAction<Set<number>>>}
              setFilteredDataTree={setFilteredDataTree as React.Dispatch<React.SetStateAction<Node<IDataTree>>>}
              dataFilter={dataFilter}
              dataTree={dataTree}
              dataType={dataType}
              setDataFilter={setDataFilter}
            />
            <Stack
              direction="row"
              className="myFlexFitContentContainer"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                alignItems: "center",
              }}
            >
              <List sx={{ flexGrow: 1, mr: 1 }} disablePadding>
                <DataTreeMenuCreateButton treeDataName="" dataType={dataType} sx={{ px: 1.5 }} />
              </List>

              <ExporterButton
                tooltip="Export tagset"
                exporterInfo={{
                  type: dataType === KEYWORD_TAGS ? "Tagset" : "Codeset",
                  singleUser: false,
                  users: [],
                  sdocId: -1,
                }}
                iconButtonProps={{ color: "inherit" }}
              />
            </Stack>
          </>
        )}
        {content}
      </Box>
    );
  },
);

export default TreeExplorer;
