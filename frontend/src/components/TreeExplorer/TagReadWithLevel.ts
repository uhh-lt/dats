import { TagRead } from "../../api/openapi/models/TagRead.ts";

export interface TagReadWithLevel {
  data: TagRead;
  level: number;
}
