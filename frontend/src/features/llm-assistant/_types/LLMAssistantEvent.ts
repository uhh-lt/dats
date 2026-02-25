import { TaskType } from "../../../api/openapi/models/TaskType";

export interface LLMAssistantEvent {
  method?: TaskType;
  selectedDocumentIds: number[];
  projectId: number;
}
