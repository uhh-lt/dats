import { Node } from "ts-tree-structure";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree.ts";
import { ITagTree } from "./ITagTree.ts";

interface FilterProps {
  dataTree: Node<ICodeTree> | Node<ITagTree>;
  nodesToExpand: Set<number>;
  dataFilter: string;
}

export function tagsToTree(tags: DocumentTagRead[]): ITagTree {
  // map input to ITagTree
  const newTags: ITagTree[] = tags.map((data) => {
    return { data: data };
  });

  // create a dummy root node that will hold the results
  const dummyRootNode: DocumentTagRead = {
    created: "",
    description: "This is the root node",
    title: "root",
    project_id: -1,
    updated: "",
    id: -1,
    color: "",
    parent_tag_id: undefined,
  };
  // create children of the new root node (all nodes that have no parent!)
  const children = newTags.filter((tagTree) => !tagTree.data.parent_tag_id);
  const root: ITagTree = { data: dummyRootNode, children: children };

  // create the full tree using the other nodes
  const nodes = newTags.filter((tagTree) => tagTree.data.parent_tag_id);

  root.children!.forEach((tagTree) => {
    tagsToTreeRecursion(tagTree, nodes);
  });

  return root;
}

function tagsToTreeRecursion(root: ITagTree, nodes: ITagTree[]): ITagTree {
  root.children = nodes.filter((node) => node.data.parent_tag_id === root.data.id);
  const otherNodes = nodes.filter((node) => node.data.parent_tag_id !== root.data.id);

  root.children.forEach((tagTree) => {
    tagsToTreeRecursion(tagTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot(tree: ITagTree | null): DocumentTagRead[] {
  if (!tree) {
    return [];
  }

  const allChildren = flatTree(tree);
  return [tree.data, ...allChildren];
}

export function flatTree(tree: ITagTree | null): DocumentTagRead[] {
  let result: DocumentTagRead[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.data), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}

export function TreeFilter({ dataTree, nodesToExpand, dataFilter }: FilterProps) {
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
      { strategy: "breadth" },
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
  }
  return { dataTree, nodesToExpand };
}
