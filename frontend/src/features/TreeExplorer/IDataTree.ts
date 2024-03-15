import { CodeRead, DocumentTagRead } from "../../api/openapi";

export interface ITree<T = void> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export type IDataTree = ITree<DocumentTagRead | CodeRead>;
