import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { ITagTree } from "./ITagTree.ts";

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
