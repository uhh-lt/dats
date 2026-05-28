# Chat with data - user journey

Date: 2026-02-12
Status: draft

## Journey phases

| Phase    | User actions                                         | System response                                      | Pain points                    | Opportunities                                             |
| -------- | ---------------------------------------------------- | ---------------------------------------------------- | ------------------------------ | --------------------------------------------------------- |
| Discover | Opens the global chat tab from the sidebar           | Shows chat intro and scope selection panel           | Unsure what to select          | Provide examples and quick tips                           |
| Scope    | Selects documents, annotations, and memos to include | Displays selection summary and context size estimate | Context too large              | Offer clear warnings and suggestions to narrow scope      |
| Ask      | Types a question about interpretations or summaries  | Sends message and streams response                   | Waiting for response           | Show progress indicator and estimated time                |
| Review   | Reads response and checks references                 | Highlights source references and links               | Needs verification             | Provide quick links to source documents/annotations/memos |
| Act      | Saves insights or adjusts scope for follow-up        | Keeps chat history for session                       | Losing context across sessions | Consider persistent sessions in later iteration           |

## Key moments

- First-time guidance: show example prompts (e.g., "Summarize the main themes in these annotations").
- Context warning: prevent sending when over limit, with clear suggestions.
- Source navigation: one click to open referenced documents or annotations.
