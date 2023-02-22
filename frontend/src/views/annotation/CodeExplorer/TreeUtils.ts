import { CodeRead } from "../../../api/openapi";
import ICodeTree from "./ICodeTree";

export function codesToTree(codes: CodeRead[]): ICodeTree {
  // map input to ICodeTree
  let newCodes: ICodeTree[] = codes.map((code) => {
    return { code: code };
  });

  // create a dummy root node that will hold the results
  const dummyRootNode: CodeRead = {
    created: "",
    description: "This is the root node",
    name: "root",
    project_id: -1,
    updated: "",
    user_id: -1,
    id: -1,
    color: "",
    parent_code_id: undefined,
  };
  // create children of the new root node (all nodes that have no parent!)
  let children = newCodes.filter((codeTree) => !codeTree.code.parent_code_id);
  let root: ICodeTree = { code: dummyRootNode, children: children };

  // create the full tree using the other nodes
  let nodes = newCodes.filter((codeTree) => codeTree.code.parent_code_id);

  root.children!.forEach((codeTree) => {
    codesToTreeRecursion(codeTree, nodes);
  });

  return root;
}

function codesToTreeRecursion(root: ICodeTree, nodes: ICodeTree[]): ICodeTree {
  root.children = nodes.filter((node) => node.code.parent_code_id === root.code.id);
  let otherNodes = nodes.filter((node) => node.code.parent_code_id !== root.code.id);

  root.children.forEach((codeTree) => {
    codesToTreeRecursion(codeTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot(tree: ICodeTree | null): CodeRead[] {
  if (!tree) {
    return [];
  }

  let allChildren = flatTree(tree);
  return [tree.code, ...allChildren];
}

export function flatTree(tree: ICodeTree | null): CodeRead[] {
  let result: CodeRead[] = [];
  if (tree && tree.children) {
    result = [...tree.children.map((value) => value.code), ...result];
    tree.children.forEach((value) => {
      result = [...result, ...flatTree(value)];
    });
  }
  return result;
}