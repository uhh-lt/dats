import { cloneDeep } from "lodash";
import { Node } from "ts-tree-structure";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import ICodeTree from "../../views/annotation/CodeExplorer/ICodeTree.ts";
import { ITagTree } from "./ITagTree.ts";

interface FilterProps {
  dataTree: Node<ICodeTree> | Node<ITagTree>;
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

export function filterTree({ dataTree, dataFilter }: FilterProps) {
  let nodesToExpand = new Set<number>();

  // clone tree using lodash
  let dataTreeCopy = cloneDeep(dataTree);

  if (dataFilter.trim().length > 0) {
    const nodesToKeep = new Set<number>();

    // find all nodes that match the filter
    dataTreeCopy.walk(
      (node) => {
        if (
          (node as Node<ICodeTree>).model.data.name?.startsWith(dataFilter.trim()) ||
          (node as Node<ITagTree>).model.data.title?.startsWith(dataFilter.trim())
        ) {
          // keep the node
          nodesToKeep.add(node.model.data.id);

          // keep its children
          node.children.map((child) => child.model.data.id).forEach((id) => nodesToKeep.add(id));

          // keep its parents
          let parent = node.parent;
          while (parent) {
            nodesToKeep.add(parent.model.data.id);
            nodesToExpand.add(parent.model.data.id);
            parent = parent.parent;
          }
        }
        return true;
      },
      { strategy: "breadth" },
    );

    // filter the dataTree
    let nodes_to_remove = (dataTreeCopy as Node<ITagTree | ICodeTree>).all(
      (node) => !nodesToKeep.has(node.model.data.id),
    );
    nodes_to_remove.forEach((node) => {
      node.drop();
    });
  } else {
    dataTreeCopy = dataTree;
  }
  return { dataTree: dataTreeCopy, nodesToExpand };
}
