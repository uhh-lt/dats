import { CodeRead } from "../../../api/openapi";

export default interface ICodeTree {
  code: CodeRead;
  children?: ICodeTree[];
}
