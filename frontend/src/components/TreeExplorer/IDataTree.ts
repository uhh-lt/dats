import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { TagRead } from "../../api/openapi/models/TagRead.ts";

export interface ITree<T = void> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export type IDataTree = ITree<TagRead | CodeRead>;
