import TreeView, { TreeViewProps } from "@mui/lab/TreeView";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowRightIcon from "@mui/icons-material/ArrowRight";
import * as React from "react";
import FolderIcon from "@mui/icons-material/Folder";
import TreeItem, { treeItemClasses, TreeItemProps } from "@mui/lab/TreeItem";
import { SvgIconProps } from "@mui/material/SvgIcon";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { ITagTree } from "./ITagTree";
import { DocumentTagRead } from "../../api/openapi";
import LabelIcon from "@mui/icons-material/Label";

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
  const { labelIcon: LabelIcon, actions, labelText, labelIconColor, hasChildren, ...other } = props;

  return (
    <StyledTreeItemRoot
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

export interface TagTreeViewProps {
  openContextMenu?: (node: ITagTree) => (event: any) => void;
  data: ITagTree;
  onExpandClick: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onCollapseClick: (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onTagClick?: (tag: DocumentTagRead) => void;
  renderActions?: (node: ITagTree) => React.ReactNode;
}

function TagTreeView({
  renderActions,
  data,
  onExpandClick,
  onCollapseClick,
  openContextMenu,
  onTagClick,
  ...props
}: TagTreeViewProps & TreeViewProps) {
  const renderTree = (nodes: ITagTree[]) => {
    return nodes.map((node) => (
      <StyledTreeItem
        hasChildren={Array.isArray(node.children) && node.children.length > 0}
        key={node.data.id}
        nodeId={node.data.id.toString()}
        labelText={node.data.title}
        labelIcon={Array.isArray(node.children) && node.children.length > 0 ? FolderIcon : LabelIcon}
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
        onClick={onTagClick ? () => onTagClick(node.data) : undefined}
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

export default TagTreeView;
