import { useEffect, useMemo, useRef, useState } from "react";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree";
import { ITagTree } from "./ITagTree";
import { Node } from "ts-tree-structure";
import { Divider, TextField, Toolbar, Typography } from "@mui/material";
import { ICode } from "../../views/annotation/TextAnnotator/ICode";
import CodeToggleEnabledButton from "../../views/annotation/CodeExplorer/CodeToggleEnabledButton";
import { CodeRead } from "../../api/openapi";

interface FilterProps {
  dataTree: Node<ICodeTree> | Node<ITagTree>;
  nodesToExpand: Set<number>;
  expandCodes: (codesToExpand: string[]) => void;
  handleExpandClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  handleCollapseClick: (event: React.MouseEvent<HTMLDivElement>, nodeId: string) => void;
  onCreateCodeSuccess: (code: CodeRead, isNewCode: boolean) => void;
}

function Filter({ dataTree, nodesToExpand, expandCodes, handleExpandClick }: FilterProps) {
  const [dataFilter, setDataFilter] = useState<string>("");
  //   const nodesToExpand = new Set<number>();
  // build the tree
  //   const codeTree = new Tree().parse<ICodeTree>(codesToTree(projectCodes.data));
  //   const dataTreeRef = useRef(dataTree);
  useMemo(() => {
    if (dataFilter.trim().length > 0) {
      const nodesToKeep = new Set<number>();

      // find all nodes that match the filter
      dataTree.walk(
        (node) => {
          if ("code" in node.model) {
            if (node.model.code.name.startsWith(dataFilter.trim())) {
              // keep the node
              nodesToKeep.add(node.model.code.id);

              // keep its children
              node.children
                .map((child) => ("code" in child.model ? child.model.code.id : child.model.data.id))
                .forEach((id) => nodesToKeep.add(id));

              // keep its parents
              let parent = node.parent;
              while (parent) {
                if ("code" in parent.model) {
                  nodesToKeep.add(parent.model.code.id);
                  nodesToExpand.add(parent.model.code.id);
                  parent = parent.parent;
                } else {
                  nodesToKeep.add(parent.model.data.id);
                  nodesToExpand.add(parent.model.data.id);
                  parent = parent.parent;
                }
              }
            }
          } else {
            if (node.model.data.title.startsWith(dataFilter.trim())) {
              // keep the node
              nodesToKeep.add(node.model.data.id);

              // keep its children
              node.children
                .map((child) => ("code" in child.model ? child.model.code.id : child.model.data.id))
                .forEach((id) => nodesToKeep.add(id));

              // keep its parents
              let parent = node.parent;
              while (parent) {
                if ("code" in parent.model) {
                  nodesToKeep.add(parent.model.code.id);
                  nodesToExpand.add(parent.model.code.id);
                  parent = parent.parent;
                } else {
                  nodesToKeep.add(parent.model.data.id);
                  nodesToExpand.add(parent.model.data.id);
                  parent = parent.parent;
                }
              }
            }
          }
          return true;
        },
        { strategy: "breadth" }
      );

      // filter the codeTree
      let nodes_to_remove =
        "code" in dataTree.model
          ? (dataTree as Node<ICodeTree>).all((node) => !nodesToKeep.has(node.model.code.id))
          : (dataTree as Node<ITagTree>).all((node) => !nodesToKeep.has(node.model.data.id));
      nodes_to_remove.forEach((node) => {
        node.drop();
      });
      dataTree = "code" in dataTree.model ? (dataTree as Node<ICodeTree>) : (dataTree as Node<ITagTree>);
      // return { dataTree, nodesToExpand };
    }
  }, [dataTree, nodesToExpand, dataFilter]);
  // effects
  // automatically expand filtered nodes
  useEffect(() => {
    expandCodes(Array.from(nodesToExpand).map((id) => id.toString()));
  }, [expandCodes, nodesToExpand]);
  return (
    <>
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Filter codes
        </Typography>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder={"type name here..."}
          variant="outlined"
          size="small"
          value={dataFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setDataFilter(event.target.value);
          }}
        />
        {"code" in dataTree.model ? <CodeToggleEnabledButton code={(dataTree as Node<ICodeTree>)?.model} /> : <>TBD</>}
      </Toolbar>
      <Divider />
    </>
  );
}

export default Filter;
