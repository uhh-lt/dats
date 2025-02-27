import { CodeRead } from "../../api/openapi/models/CodeRead.ts";

export interface CodeReadWithLevel {
  data: CodeRead;
  level: number;
}
