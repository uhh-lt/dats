import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";

export interface ITree<T = void> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export type ITagTree = ITree<DocumentTagRead>;

// export function arrayToTree<T>(data: T[]): ITree<T> {
//   // map input to ICodeTree
//   let newCodes: ITree<T>[] = data.map((d) => {
//     return { data: d };
//   });

//   // create a dummy root node that will hold the results
//   const dummyRootNode: CodeRead = {
//     created: "",
//     description: "This is the root node",
//     name: "root",
//     project_id: -1,
//     updated: "",
//     user_id: -1,
//     id: -1,
//     color: "",
//     parent_id: undefined,
//   };
//   // create children of the new root node (all nodes that have no parent!)
//   let children = newCodes.filter((codeTree) => !codeTree.code.parent_id);
//   let root: ICodeTree = { code: dummyRootNode, children: children };

//   // create the full tree using the other nodes
//   let nodes = newCodes.filter((codeTree) => codeTree.code.parent_id);

//   root.children!.forEach((codeTree) => {
//     dataToTreeRecursion(codeTree, nodes);
//   });

//   return root;
// }

// function dataToTreeRecursion<T>(root: ITree<T>, nodes: ITree<T>[]): ITree<T> {
//   root.children = nodes.filter((node) => node.getParentId() === root.getId());
//   let otherNodes = nodes.filter((node) => node.getParentId() !== root.getId());

//   root.children.forEach((tree) => {
//     dataToTreeRecursion(tree, otherNodes);
//   });

//   return root;
// }

// export function flatTreeWithRoot<T>(tree: ITree<T> | null): T[] {
//   if (!tree) {
//     return [];
//   }

//   let allChildren = flatTree(tree);
//   return [tree.data, ...allChildren];
// }

// export function flatTree<T>(tree: ITree<T> | null): T[] {
//   let result: T[] = [];
//   if (tree && tree.children) {
//     result = [...tree.children.map((value) => value.data), ...result];
//     tree.children.forEach((value) => {
//       result = [...result, ...flatTree(value)];
//     });
//   }
//   return result;
// }
