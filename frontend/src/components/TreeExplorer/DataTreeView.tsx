import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import Box from "@mui/material/Box";
import { SvgIconProps } from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { TreeItem, TreeViewProps } from "@mui/x-tree-view";
import * as React from "react";

import AbcIcon from "@mui/icons-material/Abc";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { IDataTree } from "./IDataTree.ts";

export interface DataTreeViewProps {
  data: IDataTree;
  renderActions?: (node: IDataTree) => React.ReactNode;
  dataIcon?: React.ElementType<SvgIconProps>;
}

function DataTreeView({ renderActions, data, dataIcon, ...props }: DataTreeViewProps & TreeViewProps<boolean>) {
  const renderTree = (nodes: IDataTree[]) => {
    return nodes.map((node) => {
      const hasChildren = Array.isArray(node.children) && node.children.length > 0;
      return (
        <TreeItem
          key={node.data.id}
          itemId={node.data.id.toString()}
          slots={{
            expandIcon: ArrowRightIcon,
            collapseIcon: ArrowDropDownIcon,
          }}
          label={
            <Box sx={{ display: "flex", alignItems: "center", p: 0.5, pr: 0 }}>
              <Box
                component={hasChildren ? FolderIcon : dataIcon ? dataIcon : AbcIcon}
                color={node.data.color}
                sx={{ mr: 1 }}
              />
              <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
                {node.data.name}
              </Typography>
              {renderActions ? renderActions(node) : undefined}
            </Box>
          }
        >
          {hasChildren && <React.Fragment> {renderTree(node.children!)}</React.Fragment>}
        </TreeItem>
      );
    });
  };

  return (
    <SimpleTreeView
      expansionTrigger="iconContainer"
      slots={{
        collapseIcon: ArrowDropDownIcon,
        expandIcon: ArrowRightIcon,
      }}
      {...props}
    >
      {data.children && renderTree(data.children)}
    </SimpleTreeView>
  );
}

export default DataTreeView;
