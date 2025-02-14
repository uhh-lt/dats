import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";

export interface ITree<T = void> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export type IDataTree = ITree<DocumentTagRead | CodeRead>;
