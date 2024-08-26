import { LLMJobType } from "../../api/openapi/models/LLMJobType.ts";

export interface LLMAssistanceEvent {
  method?: LLMJobType;
  selectedDocumentIds: number[];
}
