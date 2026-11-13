# The Agent View

The **Agent View** lets you chat with AI agents that work directly with your project data. Instead of clicking through views yourself, you describe what you want in natural language — _"Which documents have no annotations yet?"_, _"Tag all interviews about climate with Topic: Environment"_ — and the agent looks up the data, answers your questions, and makes changes for you.

The agents work through the same DATS endpoints that power the application itself, and they act **with your permissions**: an agent can only see and do what your account may see and do. Changes that delete data or overwrite it in bulk never run silently — the agent pauses and asks for your approval first.

_(The Agent View is different from the [LLM Assistant](llm-assistant.md), which runs guided batch-annotation jobs whose results you review and apply afterwards, and from [AI Tools via MCP](mcp-integration.md), which connects your own external AI tool to DATS.)_

## 1\. Accessing the Agent View

The Agent View is a project view. Open it in one of three ways:

1. Click the **Agent icon** in the left Navigation Bar (between the Logbook and the Tools menu).
2. Press the keyboard shortcut **Ctrl/Cmd + Shift + G**.
3. Open the quick command palette and choose **Open Agent**.

The view opens in a tab in the top Tab Bar, like any other view.

## 2\. Choosing the Agent and the Model

The toolbar at the top offers two pickers:

- **Agent:** Which assistant you talk to. Each agent has its own set of DATS tools:
    - **Project agent:** Helps you manage the project — its codes, tags, folders, metadata, memos and members — and search across it.
    - **Document & annotation agent:** Helps you work with the project's documents — their content, metadata and tags, and their span, sentence and bounding box annotations.
- **LLM:** Which language model the agent runs on. **Default** uses the first model of the configured provider; open the dropdown to pick another available model.

Every chat belongs to one agent. Switching the agent in the toolbar starts a new chat, and opening an existing chat automatically selects its agent.

## 3\. Chatting with the Agent

Type your prompt into the input at the bottom. **Enter** sends it, **Shift + Enter** adds a new line, and while the agent works, the send button turns into a **stop button** that cancels the run. An empty chat suggests a few starter prompts you can click to get going.

- **@-mentions:** Type `@` to mention a specific document, code or tag. Pick it from the popover to insert a reference the agent resolves to the real entity.
- **Streaming answers:** The answer streams in as it is written. The model's reasoning appears under a collapsible _Thinking…_ line, and the actions the agent takes are shown as grouped tool calls with their arguments.
- **DATS links:** When the agent names a project entity — a document, a code, a tag — it appears as a link in the answer. Click it to open the entity in DATS.

The agent answers in your language and formats its answers with Markdown. If a request would need a capability the agent does not have, it tells you instead of guessing.

## 4\. Approving Changes

Reading data and creating or updating single items run right away. Actions that **delete** something or **overwrite data in bulk** are different: the agent pauses, and each such action appears in the chat with its own **Approve** and **Deny** buttons.

- **Approve** runs the action; **Deny** skips it, and the agent continues without it.
- If several actions wait for approval, a banner above the input offers **Approve all** and **Deny all**.
- While approvals are pending, the input is blocked — answer the pending actions first.

## 5\. Managing Chats

Your chats are stored **per project and per user** — they are private to you, and each project has its own list. The sidebar on the left lists them, newest first and grouped by date.

- **New chat:** Click the **New chat** button to start a fresh conversation.
- **Search:** Filter the list by title with the search field.
- **Rename / Delete:** Hover over a chat to reveal its actions. Rename edits the title inline; delete asks for confirmation first.
- **Titles:** A new chat is titled after its first prompt and gets an AI-generated title once the first answer is complete.
- **URL:** The open chat lives in the page URL, so reloading the page — or sharing the link — reopens the same chat.
