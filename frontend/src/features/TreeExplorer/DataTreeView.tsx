import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import FolderIcon from "@mui/icons-material/Folder";
import Box from "@mui/material/Box";
import { SvgIconProps } from "@mui/material/SvgIcon";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { TreeItem, TreeItemProps, TreeView, TreeViewProps, treeItemClasses } from "@mui/x-tree-view";
import * as React from "react";

import AbcIcon from "@mui/icons-material/Abc";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants.ts";
import { IDataTree } from "./IDataTree.ts";

type StyledTreeItemProps = TreeItemProps & {
  labelIcon: React.ElementType<SvgIconProps>;
  labelIconColor: string;
  labelInfo?: string;
  labelText: string;
  actions: React.ReactNode;
  hasChildren: boolean;
};

const StyledTreeItemRoot = styled(TreeItem)(({ theme }) => ({
  color: theme.palette.text.secondary,
  [`& .${treeItemClasses.content}`]: {
    color: theme.palette.text.secondary,
    paddingRight: theme.spacing(1),
    fontWeight: theme.typography.fontWeightMedium,
    "&.Mui-expanded": {
      fontWeight: theme.typography.fontWeightRegular,
    },
    "&.Mui-selected.Mui-focused": {
      backgroundColor: `${theme.palette.action.selected} !important`,
    },
    "&.Mui-focused": {
      backgroundColor: "transparent !important",
    },
    "&:hover": {
      backgroundColor: "transparent",
    },
    "&.Mui-focused, &.Mui-selected, &.Mui-selected.Mui-focused": {
      backgroundColor: `${theme.palette.action.selected}`,
    },
    [`& .${treeItemClasses.label}`]: {
      fontWeight: "inherit",
      color: "inherit",
    },
  },
  [`& .${treeItemClasses.label}`]: {
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  [`& .${treeItemClasses.iconContainer}`]: {
    width: "fit-content !important",
    height: "48px",
    alignItems: "center",
    marginRight: "0px !important",
    justifyContent: "center",
    "&:hover": {
      backgroundColor: theme.palette.action.hover,
    },
  },
  [`& .${treeItemClasses.group}`]: {
    [`& .${treeItemClasses.content}`]: {
      paddingLeft: theme.spacing(2),
    },
  },
}));

function StyledTreeItem(props: StyledTreeItemProps) {
  const { labelIcon: LabelIcon, actions, labelText, labelIconColor, hasChildren, onContextMenu, ...other } = props;

  return (
    <StyledTreeItemRoot
      className="Tim"
      ContentProps={{
        className: "Tom",
        onContextMenu: onContextMenu,
      }}
      label={
        <Box sx={{ display: "flex", alignItems: "center", p: 0.5, pr: 0, ml: !hasChildren ? "30px" : 0 }}>
          <Box component={LabelIcon} color={labelIconColor} sx={{ mr: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: "inherit", flexGrow: 1 }}>
            {labelText}
          </Typography>
          {actions}
        </Box>
      }
      {...other}
    />
  );
}

export interface DataTreeViewProps {
  openContextMenu?: (node: IDataTree) => React.MouseEventHandler<HTMLLIElement>;
  data: IDataTree;
  dataType: string;
  onExpandClick: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onCollapseClick: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onDataClick?: (data: DocumentTagRead | CodeRead) => void;
  renderActions?: (node: IDataTree) => React.ReactNode;
  dataIcon?: React.ElementType<SvgIconProps>;
}

function DataTreeView({
  renderActions,
  data,
  dataType,
  onExpandClick,
  onCollapseClick,
  openContextMenu,
  onDataClick,
  dataIcon,
  ...props
}: DataTreeViewProps & TreeViewProps<boolean>) {
  const renderTree = (nodes: IDataTree[]) => {
    return nodes.map((node) => (
      <StyledTreeItem
        hasChildren={Array.isArray(node.children) && node.children.length > 0}
        key={node.data.id}
        nodeId={node.data.id.toString()}
        labelText={dataType === KEYWORD_TAGS ? (node.data as DocumentTagRead).title : (node.data as CodeRead).name}
        labelIcon={
          Array.isArray(node.children) && node.children.length > 0 ? FolderIcon : dataIcon ? dataIcon : AbcIcon
        }
        expandIcon={
          <Box
            sx={{ width: "30px", display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}
            onClick={(e) => onExpandClick(e, node.data.id.toString())}
          >
            <ArrowRightIcon />
          </Box>
        }
        collapseIcon={
          <Box
            sx={{ width: "30px", display: "flex", height: "100%", alignItems: "center", justifyContent: "center" }}
            onClick={(e) => onCollapseClick(e, node.data.id.toString())}
          >
            <ArrowDropDownIcon />
          </Box>
        }
        labelIconColor={node.data.color}
        actions={renderActions ? renderActions(node) : undefined}
        onContextMenu={openContextMenu ? openContextMenu(node) : undefined}
        onClick={onDataClick ? () => onDataClick(node.data) : undefined}
      >
        {Array.isArray(node.children) && node.children.length > 0 && (
          <React.Fragment> {renderTree(node.children)}</React.Fragment>
        )}
      </StyledTreeItem>
    ));
  };

  return (
    <TreeView defaultCollapseIcon={<ArrowDropDownIcon />} defaultExpandIcon={<ArrowRightIcon />} {...props}>
      {data.children && renderTree(data.children)}
    </TreeView>
  );
}

export default DataTreeView;
