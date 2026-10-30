import { AgentName } from "@models/AgentName";

interface AgentSuggestion {
  title: string;
  label: string;
  prompt: string;
}

/** The starter prompts of each agent, shown on an empty chat. */
export const AGENT_SUGGESTIONS: Record<AgentName, AgentSuggestion[]> = {
  [AgentName.PROJECT]: [
    {
      title: "Summarize this project",
      label: "its documents, codes and tags",
      prompt: "Give me an overview of this project: how many documents, codes and tags it has, and what stands out.",
    },
    {
      title: "Find unused codes",
      label: "codes without annotations",
      prompt: "Which codes of this project have no annotations yet?",
    },
    {
      title: "Who works on this project?",
      label: "the members of the project",
      prompt: "Which users are members of this project?",
    },
    {
      title: "Tag overview",
      label: "tags and their documents",
      prompt: "Which tags exist in this project, and how many documents does each tag have?",
    },
  ],
  [AgentName.SOURCE_DOCUMENT]: [
    {
      title: "Summarize the latest document",
      label: "its content and annotations",
      prompt: "Summarize the most recently added document of this project and its annotations.",
    },
    {
      title: "Unannotated documents",
      label: "documents without annotations",
      prompt: "Which documents of this project have no annotations yet?",
    },
    {
      title: "Most used codes",
      label: "in span annotations",
      prompt: "Which codes are used most often in the span annotations of this project?",
    },
    {
      title: "Recent changes",
      label: "the latest documents",
      prompt: "Which documents were added to this project most recently?",
    },
  ],
};
