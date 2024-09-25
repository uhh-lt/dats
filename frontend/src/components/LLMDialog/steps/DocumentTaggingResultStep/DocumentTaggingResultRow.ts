import { DocumentTagRead } from "../../../../api/openapi/models/DocumentTagRead.ts";

export interface DocumentTaggingResultRow {
  sdocId: number;
  current_tags: Array<DocumentTagRead>;
  suggested_tags: Array<DocumentTagRead>;
  merged_tags: Array<DocumentTagRead>;
  reasoning: string;
}
