import { ICode } from "./ICode";

export interface ISpanAnnotation {
  i: number;
  id?: number;
  begin: number;
  end: number;
  code?: ICode;
  groups?: number[];
  text?: string;
}
