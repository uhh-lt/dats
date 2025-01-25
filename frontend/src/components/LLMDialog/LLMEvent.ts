import { TaskType } from "../../api/openapi/models/TaskType.ts";

export interface LLMAssistanceEvent {
  method?: TaskType;
  selectedDocumentIds: number[];
  projectId: number;
}
