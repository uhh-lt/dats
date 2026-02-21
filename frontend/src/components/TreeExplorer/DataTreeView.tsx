import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import Box from "@mui/material/Box";
import { SvgIconProps } from "@mui/material/SvgIcon";
import { TreeItem, TreeViewProps } from "@mui/x-tree-view";
import * as React from "react";

import AbcIcon from "@mui/icons-material/Abc";
import { Typography } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view/SimpleTreeView";
import { useCallback } from "react";
import { Droppable } from "../DnD/Droppable.tsx";
import { ITree, NamedObjWithParent } from "./ITree.ts";

export interface DataTreeViewProps<T extends NamedObjWithParent> {
  data: ITree<T>;
  renderNode?: (node: ITree<T>) => React.ReactNode;
  renderActions?: (node: ITree<T>) => React.ReactNode;
  dataIcon?: React.ElementType<SvgIconProps>;
  renderRoot?: boolean;
  disableRootActions?: boolean; // if true, the root node will not have actions
  rootIcon?: React.ElementType<SvgIconProps>;
  parentIcon?: React.ElementType<SvgIconProps>;
  droppable?: boolean | ((node: ITree<T>) => boolean);
  droppableId?: (node: ITree<T>) => string;
}

const defaultNodeRenderer = <T extends NamedObjWithParent>(node: ITree<T>) => (
  <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
    {node.data.name}
  </Typography>
);

export function DataTreeView<T extends NamedObjWithParent>({
  renderNode = defaultNodeRenderer,
  renderActions,
  data,
  dataIcon,
  droppable,
  droppableId,
  renderRoot = false,
  disableRootActions = false,
  rootIcon = FolderIcon,
  parentIcon = FolderIcon,
  ...props
}: DataTreeViewProps<T> & TreeViewProps<boolean>) {
  const renderTree = useCallback(
    (nodes: ITree<T>[], isRoot = false) => {
      return nodes.map((node) => {
        const hasChildren = Array.isArray(node.children) && node.children.length > 0;
        // Use rootIcon for the root node if provided and isRoot is true
        const iconToUse = isRoot ? rootIcon : hasChildren ? parentIcon : dataIcon ? dataIcon : AbcIcon;

        const label = (
          <Box sx={{ display: "flex", alignItems: "center", p: 0.5, pr: 0 }}>
            <Box component={iconToUse} color={node.data.color} sx={{ mr: 1 }} />
            {renderNode(node)}
            {renderActions && !(isRoot && disableRootActions) ? renderActions(node) : undefined}
          </Box>
        );
        return (
          <TreeItem
            key={node.data.id}
            itemId={node.data.id.toString()}
            slots={{
              expandIcon: ArrowRightIcon,
              collapseIcon: ArrowDropDownIcon,
            }}
            label={
              (typeof droppable === "function" ? droppable(node) : droppable) ? (
                <Droppable id={droppableId ? droppableId(node) : `folder-${node.data.id}`} Element="div">
                  {label}
                </Droppable>
              ) : (
                label
              )
            }
          >
            {hasChildren && <React.Fragment> {renderTree(node.children!, false)} </React.Fragment>}
          </TreeItem>
        );
      });
    },
    [rootIcon, parentIcon, dataIcon, renderNode, renderActions, disableRootActions, droppable, droppableId],
  );

  return (
    <SimpleTreeView
      expansionTrigger="iconContainer"
      slots={{
        collapseIcon: ArrowDropDownIcon,
        expandIcon: ArrowRightIcon,
      }}
      {...props}
    >
      {renderRoot ? renderTree([data], true) : data.children && renderTree(data.children)}
    </SimpleTreeView>
  );
}
