import { TaskType } from "@models/TaskType";

export interface LLMAssistantEvent {
  method?: TaskType;
  selectedDocumentIds: number[];
  projectId: number;
}
