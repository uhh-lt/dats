import { DocumentTagRead } from "../../api/openapi";
import { ITagTree } from "./ITagTree";

export function tagsToTree(tags: DocumentTagRead[]): ITagTree {
  // map input to ITagTree
  let newTags: ITagTree[] = tags.map((data) => {
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
  let children = newTags.filter((tagTree) => !tagTree.data.parent_tag_id);
  let root: ITagTree = { data: dummyRootNode, children: children };

  // create the full tree using the other nodes
  let nodes = newTags.filter((tagTree) => tagTree.data.parent_tag_id);

  root.children!.forEach((tagTree) => {
    tagsToTreeRecursion(tagTree, nodes);
  });

  return root;
}

function tagsToTreeRecursion(root: ITagTree, nodes: ITagTree[]): ITagTree {
  root.children = nodes.filter((node) => node.data.parent_tag_id === root.data.id);
  let otherNodes = nodes.filter((node) => node.data.parent_tag_id !== root.data.id);

  root.children.forEach((tagTree) => {
    tagsToTreeRecursion(tagTree, otherNodes);
  });

  return root;
}

export function flatTreeWithRoot(tree: ITagTree | null): DocumentTagRead[] {
  if (!tree) {
    return [];
  }

  let allChildren = flatTree(tree);
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
