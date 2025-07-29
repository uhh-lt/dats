import { TagRead } from "../../../../api/openapi/models/TagRead.ts";

export interface DocumentTaggingResultRow {
  sdocId: number;
  current_tags: Array<TagRead>;
  suggested_tags: Array<TagRead>;
  merged_tags: Array<TagRead>;
  reasoning: string;
}
