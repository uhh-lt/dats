import { TaskType } from "@api/models/TaskType";

export interface LLMAssistantEvent {
  method?: TaskType;
  selectedDocumentIds: number[];
  projectId: number;
}
