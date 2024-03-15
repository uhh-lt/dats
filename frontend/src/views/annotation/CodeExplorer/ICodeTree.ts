import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";

// export default interface ICodeTree {
//   code: CodeRead;
//   children?: ICodeTree[];
//   isRoot?: boolean;
//   length?: number;
// }

export interface ITree<T = void> {
  isRoot?: boolean;
  children?: ITree<T>[];
  length?: number;
  data: T;
}

export type ICodeTree = ITree<CodeRead>;
