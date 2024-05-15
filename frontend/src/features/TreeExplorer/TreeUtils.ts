import { cloneDeep } from "lodash";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { KEYWORD_CODES, KEYWORD_TAGS } from "../../utils/GlobalConstants.ts";
import { IDataTree } from "./IDataTree.ts";

interface FilterProps {
  dataTree: Node<IDataTree>;
  dataFilter: string;
  dataType: string;
}

export function dataToTree(data: (DocumentTagRead | CodeRead)[], dataType: string): IDataTree {
  // map input to ITagTree
  const newData: IDataTree[] = data.map((subset) => {
    return { data: subset };
  });

  // create a dummy root node that will hold the results
  const dummyRootNode: DocumentTagRead | CodeRead = {
    created: "",
    description: "This is the root node",
    name: "root",
    project_id: -1,
    updated: "",
    id: -1,
    color: "",
    parent_id: undefined,
  };
  // create children of the new root node (all nodes that have no parent!)
  let children = undefined;
  if (dataType === KEYWORD_TAGS) children = newData.filter((dataTree) => !(dataTree.data as DocumentTagRead).parent_id);
  else if (dataType === KEYWORD_CODES) children = newData.filter((dataTree) => !(dataTree.data as CodeRead).parent_id);
  const root: IDataTree = { data: dummyRootNode, children: children };

  // create the full tree using the other nodes
  let nodes: IDataTree[];
  if (dataType === KEYWORD_TAGS) nodes = newData.filter((dataTree) => (dataTree.data as DocumentTagRead).parent_id);
  else if (dataType === KEYWORD_CODES) nodes = newData.filter((dataTree) => (dataTree.data as CodeRead).parent_id);

  root.children!.forEach((tagTree) => {
    dataToTreeRecursion(tagTree, nodes, dataType);
  });

  return root;
}

function dataToTreeRecursion(root: IDataTree, nodes: IDataTree[], dataType: string): IDataTree {
  let otherNodes: IDataTree[];

  if (dataType === KEYWORD_TAGS) {
    root.children = nodes.filter((node) => (node.data as DocumentTagRead).parent_id === root.data.id);
    otherNodes = nodes.filter((node) => (node.data as DocumentTagRead).parent_id !== root.data.id);
  } else if (dataType === KEYWORD_CODES) {
    root.children = nodes.filter((node) => (node.data as CodeRead).parent_id === root.data.id);
    otherNodes = nodes.filter((node) => (node.data as CodeRead).parent_id !== root.data.id);
  } else {
    root.children = [];
  }

  root.children.forEach((dataTree) => {
    dataToTreeRecursion(dataTree, otherNodes, dataType);
  });

  return root;
}

export function flatTreeWithRoot(tree: IDataTree | null): (DocumentTagRead | CodeRead)[] {
  if (!tree) {
    return [];
  }

  const allChildren = flatTree(tree);
  return [tree.data, ...allChildren];
}

export function flatTree(tree: IDataTree | null): (DocumentTagRead | CodeRead)[] {
  let result: (DocumentTagRead | CodeRead)[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.data), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}

export function filterTree({ dataTree, dataFilter, dataType }: FilterProps) {
  const nodesToExpand = new Set<number>();

  // clone tree using lodash
  let dataTreeCopy = cloneDeep(dataTree);

  if (dataFilter.trim().length > 0) {
    const nodesToKeep = new Set<number>();

    // find all nodes that match the filter
    dataTreeCopy.walk(
      (node) => {
        if (dataType === KEYWORD_CODES) {
          const code = node.model.data as CodeRead;
          if (code.name.startsWith(dataFilter.trim())) {
            // keep the node
            nodesToKeep.add(code.id);

            // keep its children
            node.children.map((child) => (child.model.data as CodeRead).id).forEach((id) => nodesToKeep.add(id));

            // keep its parents
            let parent = node.parent;
            while (parent) {
              nodesToKeep.add((parent.model.data as CodeRead).id);
              nodesToExpand.add((parent.model.data as CodeRead).id);
              parent = parent.parent;
            }
          }
        } else if (dataType === KEYWORD_TAGS) {
          const tag = node.model.data as DocumentTagRead;
          if (tag.name.startsWith(dataFilter.trim())) {
            // keep the node
            nodesToKeep.add(tag.id);

            // keep its children
            node.children.map((child) => (child.model.data as DocumentTagRead).id).forEach((id) => nodesToKeep.add(id));

            // keep its parents
            let parent = node.parent;
            while (parent) {
              nodesToKeep.add((parent.model.data as DocumentTagRead).id);
              nodesToExpand.add((parent.model.data as DocumentTagRead).id);
              parent = parent.parent;
            }
          }
        }
        return true;
      },
      { strategy: "breadth" },
    );

    // filter the dataTree
    const nodes_to_remove = (dataTreeCopy as Node<IDataTree>).all((node) => !nodesToKeep.has(node.model.data.id));

    nodes_to_remove.forEach((node) => {
      node.drop();
    });
    dataTreeCopy = dataTreeCopy as Node<IDataTree>;
  } else {
    dataTreeCopy = dataTree;
  }
  return { dataTree: dataTreeCopy, nodesToExpand };
}
