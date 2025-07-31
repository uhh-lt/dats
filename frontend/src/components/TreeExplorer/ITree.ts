export interface NamedObjWithParent {
  id: number;
  name: string;
  color?: string;
  parent_id?: number | null | undefined;
}

export interface ITree<T extends NamedObjWithParent> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export interface NamedObjWithParentWithLevel<T extends NamedObjWithParent> {
  data: T;
  level: number;
}
