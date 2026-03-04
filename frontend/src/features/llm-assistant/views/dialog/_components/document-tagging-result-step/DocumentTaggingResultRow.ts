import { TagRead } from "@api/models/TagRead";

export interface DocumentTaggingResultRow {
  sdocId: number;
  current_tags: Array<TagRead>;
  suggested_tags: Array<TagRead>;
  merged_tags: Array<TagRead>;
  reasoning: string;
}
