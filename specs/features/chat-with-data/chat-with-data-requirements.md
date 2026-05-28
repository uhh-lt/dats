# Chat with data - requirements

Date: 2026-02-12
Status: draft

## Overview

Create a global chat experience where researchers can ask questions about selected documents, annotations, and memos, and receive AI-assisted interpretation within the DATS workflow.

## User story

As a project researcher who analyzes many documents and annotations daily,
I want to chat with selected documents, annotations, and memos,
so that I can interpret results faster and generate new insights without manually reading everything.

## Context

- Why needed: manual interpretation of large volumes of annotated text is slow and cognitively heavy.
- Current workflow: annotate documents, open annotation table, read passages, create hypotheses manually; repeat for memos and documents.
- Pain point: interpretation is time-consuming and scales poorly with dataset size.
- Success metric: user reports the chat helps them derive insights and reduces manual reading time.

## Hypothesis-driven development

- Hypothesis: A scoped chat (user-selected documents/annotations/memos) reduces interpretation time and increases insight discovery.
- Experiment design (MVP):
  - Add a global chat tab accessible from the toolbar/sidebar.
  - Provide scope filters to select documents, annotations, and memos before chatting.
  - Inject the selected content directly into the LLM context (no RAG).
  - Show an estimated context size and block sending if it exceeds the limit.
- Success criteria:
  - At least 60% of participating researchers use the chat weekly.
  - Self-reported interpretation time drops by 30% within 4 weeks.
  - 3+ actionable insights captured per project via chat within 1 month.
- Learning integration: identify which scope combinations are most used and which answers are rated helpful; prioritize next iteration accordingly.
- Iteration planning: if the context-size limit blocks common workflows, introduce summarization or RAG in a follow-up feature.

## Scope

### In scope

- New global "Chat with data" tab.
- Scope selection for documents, annotations, and memos (manual selection or from existing filters).
- Context size estimation and user warnings when selections exceed the limit.
- Reuse existing chat UI from the Perspectives feature when possible.
- Use existing backend LLM services (e.g., vLLM connection).

### Out of scope (MVP)

- RAG, semantic search, or auto-retrieval.
- Multi-project chat sessions.
- Auto-summarization of large selections.

## Functional requirements

- User can open a global chat tab from the toolbar/sidebar.
- User can select a scope of documents, annotations, and memos before sending messages.
- System shows a selection summary and estimated context size.
- System blocks sending if estimated context exceeds the limit and suggests reducing scope.
- Chat responses reference the selected data sources and allow quick navigation back to them.
- Chat history persists for the current session.

## UX requirements

- The chat panel is consistent with existing DATS layouts.
- Scope selection is discoverable and reversible (clear, edit, reset).
- Context limit warnings are clear and actionable.

## Data and permissions

- Respect existing project membership and access control.
- Only content the user can access is included in the chat context.

## Non-functional requirements

- Response time: initial response under 15 seconds for typical scope sizes.
- Reliability: graceful error handling when LLM service is unavailable.
- Privacy: no data leaves configured LLM infrastructure.

## Analytics

- Track number of chat sessions, messages per session, and scope composition.
- Track how often users hit context limit warnings.
- Optional: capture user feedback on response helpfulness.

## Open questions and assumptions

- Assumption: chat history is session-only for MVP.
- Open question: should chat sessions be stored and shareable within a project?

## Related documentation

- None yet.
