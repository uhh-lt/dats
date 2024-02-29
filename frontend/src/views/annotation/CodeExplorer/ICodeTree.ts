import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";

export default interface ICodeTree {
  code: CodeRead;
  children?: ICodeTree[];
  isRoot?: boolean;
  length?: number;
}
