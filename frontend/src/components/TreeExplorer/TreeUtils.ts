import { cloneDeep } from "lodash";
import { Node } from "ts-tree-structure";
import { ITree, NamedObjWithParent } from "./ITree.ts";

interface FilterProps<T extends NamedObjWithParent> {
  dataTree: Node<ITree<T>>;
  dataFilter: string;
}

export function dataToTree<T extends NamedObjWithParent>(data: T[], rootNode: T): ITree<T> {
  // map input to IDataTree
  const newData: ITree<T>[] = data.map((subset) => {
    return { data: subset };
  });

  // // create a dummy root node that will hold the results
  // const dummyRootNode: TagRead | CodeRead = {
  //   created: "",
  //   description: "This is the root node",
  //   name: "root",
  //   project_id: -1,
  //   updated: "",
  //   id: -1,
  //   color: "",
  //   parent_id: undefined,
  //   memo_ids: [],
  // };
  // create children of the new root node (all nodes that have no parent!)
  const children = newData.filter((dataTree) => !dataTree.data.parent_id);
  const root: ITree<T> = { data: rootNode, children: children };

  // create the full tree using the other nodes
  const nodes: ITree<T>[] = newData.filter((dataTree) => dataTree.data.parent_id);

  root.children!.forEach((tagTree) => {
    dataToTreeRecursion(tagTree, nodes);
  });

  return root;
}

function dataToTreeRecursion<T extends NamedObjWithParent>(root: ITree<T>, nodes: ITree<T>[]): ITree<T> {
  const otherNodes = nodes.filter((node) => node.data.parent_id !== root.data.id);
  root.children = nodes.filter((node) => node.data.parent_id === root.data.id);

  root.children.forEach((dataTree) => {
    dataToTreeRecursion(dataTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot<T extends NamedObjWithParent>(tree: ITree<T> | null): T[] {
  if (!tree) {
    return [];
  }

  const allChildren = flatTree(tree);
  return [tree.data, ...allChildren];
}

export function flatTree<T extends NamedObjWithParent>(tree: ITree<T> | null): T[] {
  let result: T[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.data), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}

/**
 * Sorts tree children based on a custom sort order array.
 * Items in sortOrder come first (in that order), followed by remaining items by ID.
 */
export function sortTreeByCustomOrder<T extends NamedObjWithParent>(
  tree: ITree<T>,
  sortOrder: number[]
): ITree<T> {
  const sortChildren = (children: ITree<T>[] | undefined): ITree<T>[] | undefined => {
    if (!children || children.length === 0) return children;

    // Create a map for O(1) lookup of sort position
    const orderMap = new Map<number, number>();
    sortOrder.forEach((id, index) => {
      orderMap.set(id, index);
    });

    // Sort children: items in sortOrder come first, then by ID
    const sorted = [...children].sort((a, b) => {
      const orderA = orderMap.get(a.data.id);
      const orderB = orderMap.get(b.data.id);

      // Both in sort order - use sort order position
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      // Only A in sort order - A comes first
      if (orderA !== undefined) return -1;
      // Only B in sort order - B comes first
      if (orderB !== undefined) return 1;
      // Neither in sort order - sort by ID
      return a.data.id - b.data.id;
    });

    // Recursively sort children
    return sorted.map((child) => ({
      ...child,
      children: sortChildren(child.children),
    }));
  };

  return {
    ...tree,
    children: sortChildren(tree.children),
  };
}

export function filterTree<T extends NamedObjWithParent>({ dataTree, dataFilter }: FilterProps<T>) {
  const nodesToExpand = new Set<number>();

  // clone tree using lodash
  let dataTreeCopy = cloneDeep(dataTree);

  if (dataFilter.trim().length > 0) {
    const nodesToKeep = new Set<number>();

    // find all nodes that match the filter
    dataTreeCopy.walk(
      (node) => {
        const data = node.model.data;
        if (data.name.startsWith(dataFilter.trim())) {
          // keep the node
          nodesToKeep.add(data.id);

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
    const nodes_to_remove = (dataTreeCopy as Node<ITree<T>>).all((node) => !nodesToKeep.has(node.model.data.id));

    nodes_to_remove.forEach((node) => {
      node.drop();
    });
    dataTreeCopy = dataTreeCopy as Node<ITree<T>>;
  } else {
    dataTreeCopy = dataTree;
  }
  return { dataTree: dataTreeCopy, nodesToExpand };
}
