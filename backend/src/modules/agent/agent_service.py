import re
import uuid
from collections.abc import AsyncIterator, Sequence
from typing import Any, NamedTuple

from ag_ui.core import AssistantMessage, RunAgentInput
from fastapi import FastAPI
from fastmcp import FastMCP
from loguru import logger
from pydantic import ValidationError
from pydantic_ai import Agent, PromptedOutput
from pydantic_ai.exceptions import ModelAPIError, UnexpectedModelBehavior
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.messages import (
    ModelMessage,
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    RetryPromptPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.profiles.openai import OpenAIModelProfile
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.run import AgentRunResult
from pydantic_ai.tools import DeferredToolRequests, RunContext, ToolDefinition
from pydantic_ai.toolsets import AbstractToolset
from pydantic_ai.ui.ag_ui import AGUIAdapter
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from common.singleton_meta import SingletonMeta
from config import conf
from core.memo.memo_enum import AttachedObjectType
from core.project.project_crud import crud_project
from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentRunStream,
    AgentSessionHistory,
    AgentSessionTitle,
    AgentToolRead,
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_exceptions import (
    AgentSessionHistoryInvalidError,
    AgentSessionIdInvalidError,
    AgentSessionNotInProjectError,
    AgentSessionPendingApprovalError,
    UnknownAgentModelError,
)
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import (
    SESSION_ID_MAX_LENGTH,
    AgentSessionCreate,
    AgentSessionRead,
    AgentSessionUpdateIntern,
)
from modules.agent.agent_session_orm import AgentSessionORM
from modules.agent.agui_adapter import (
    AgentAGUIAdapter,
    AgentOutput,
    approval_interrupts,
    to_client_error,
)
from modules.agent.auth_context_utils import (
    auth_headers_context,
    forward_auth_headers_hook,
)
from repos.db.sql_repo import SQLRepo
from repos.llm_repo import LLMRepo
from systems.mcp_system.mcp_server import create_mcp_server, requires_approval

# the provider's first LLM, unless a request names another one
DEFAULT_MODEL = "default"

TITLE_MAX_PROMPT_LENGTH = 50

# Without strict tool definitions (see _resolve_model), LLMs get complex tool
# arguments (e.g. search filters) wrong more often; they may correct them
# this many times per tool call.
TOOL_MAX_RETRIES = 3

# a DATS entity link in a prompt or answer: [label](dats:<type>/<id>)
DATS_LINK_PATTERN = re.compile(r"\[([^\]]+)\]\(dats:[a-z_]+/\d+\)")

# the entity types a DATS link can name (the frontend renders them)
_LINK_TYPES = ", ".join(
    t.value for t in AttachedObjectType if t is not AttachedObjectType.span_group
)


class _AgentConfig(NamedTuple):
    tags: list[str]
    name: str
    system_prompt: str


_COMMON_PROMPT = (
    "You work inside DATS, a web application in which research teams manage, "
    "search, annotate and analyze documents. Your tools are DATS endpoints; they "
    "act with the permissions of the user you talk to. Use them to look things "
    "up instead of guessing, and say so when a tool you would need is missing. "
    "Tools that delete, share or overwrite data in bulk ask the user for "
    "approval: call them directly when the user asks for such a change, do not "
    "ask in the chat first. "
    "Answer in the language of the user, briefly, and format with Markdown. "
    "DATS entities appear as Markdown links with the dats: scheme, "
    f"[label](dats:<type>/<id>), where <type> is one of {_LINK_TYPES} and <id> "
    "is the entity's id. The user mentions entities this way. When you mention a "
    "DATS entity whose id you know, write it the same way, e.g. "
    "[Interview 3](dats:source_document/12), so the user can open it."
)

_AGENT_CONFIGS: dict[AgentName, _AgentConfig] = {
    AgentName.PROJECT: _AgentConfig(
        tags=[
            "project",
            "code",
            "tag",
            "projectMetadata",
            "folder",
            "memo",
            "user",
            "search",
        ],
        name="ProjectAgent",
        system_prompt=(
            "You help researchers manage their DATS project: its codes, tags, "
            "folders, metadata, memos and members. " + _COMMON_PROMPT
        ),
    ),
    AgentName.SOURCE_DOCUMENT: _AgentConfig(
        tags=[
            "sourceDocument",
            "sdocMetadata",
            "spanAnnotation",
            "bboxAnnotation",
            "sentenceAnnotation",
            "code",
            "tag",
            "search",
        ],
        name="SourceDocumentAgent",
        system_prompt=(
            "You help researchers work with the documents of their DATS project: "
            "their content, metadata, tags and span, sentence and bounding box "
            "annotations. " + _COMMON_PROMPT
        ),
    ),
}

_TITLE_SYSTEM_PROMPT = (
    "You are an assistant specialized in generating concise and descriptive "
    "titles for sessions based on the user's prompt."
)


def _require_approval(
    ctx: RunContext[Any],
    tool_def: ToolDefinition,
    tool_args: dict[str, Any],
) -> bool:
    """Destructive tools need the user's approval (pydantic-ai passes the MCP
    tool annotations in the metadata)."""
    return requires_approval((tool_def.metadata or {}).get("annotations"))


def _first_prompt(messages: Sequence[ModelMessage]) -> str:
    """The first prompt of the user, with DATS links as their label."""
    prompt = next(
        (
            part.content
            for message in messages
            if isinstance(message, ModelRequest)
            for part in message.parts
            if isinstance(part, UserPromptPart) and isinstance(part.content, str)
        ),
        "",
    )
    return DATS_LINK_PATTERN.sub(r"\1", prompt)


def _prompt_title(prompt: str) -> str:
    """The title of a new session until a generated one replaces it."""
    return prompt[:TITLE_MAX_PROMPT_LENGTH].strip() or "New chat"


def _pending_approvals(messages: Sequence[ModelMessage]) -> list[ToolCallPart]:
    """The tool calls of the last model response without a result: the run
    stopped there for the user's approval."""
    responses = [i for i, m in enumerate(messages) if isinstance(m, ModelResponse)]
    if not responses:
        return []
    last = responses[-1]
    answered = {
        part.tool_call_id
        for message in messages[last + 1 :]
        if isinstance(message, ModelRequest)
        for part in message.parts
        if isinstance(part, (ToolReturnPart, RetryPromptPart))
    }
    return [
        part
        for part in messages[last].parts
        if isinstance(part, ToolCallPart) and part.tool_call_id not in answered
    ]


class AgentService(metaclass=SingletonMeta):
    """Runs the DATS agents. A run streams for minutes and its tool calls are
    requests of their own, so it holds no request session: the service reads and
    writes in short transactions of its own (see the "Streaming services"
    variation in the service instructions)."""

    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.sqlr: SQLRepo = SQLRepo()
        cls.provider: OpenAIProvider = OpenAIProvider(
            base_url=f"http://{conf.llm_provider.host}:{conf.llm_provider.port}/v1",
            api_key=conf.llm_provider.api_key,
        )
        # the model and the tools are set per run
        cls.agents: dict[AgentName, Agent[None, AgentOutput]] = {
            agent_name: Agent(
                system_prompt=config.system_prompt,
                output_type=[str, DeferredToolRequests],
            )
            for agent_name, config in _AGENT_CONFIGS.items()
        }
        # a JSON answer instead of a forced tool call, which not every
        # provider supports
        cls.title_agent: Agent[None, AgentSessionTitle] = Agent(
            output_type=PromptedOutput(AgentSessionTitle),
            system_prompt=_TITLE_SYSTEM_PROMPT,
        )
        cls.mcp_servers: dict[AgentName, FastMCP] = {}
        return super(AgentService, cls).__new__(cls)

    def initialize(self, app: FastAPI) -> None:
        """Build the MCP server of each agent: the app's MCP tools with the
        agent's tags. Called once by the app's lifespan."""
        for agent_name, config in _AGENT_CONFIGS.items():
            self.mcp_servers[agent_name] = create_mcp_server(
                app=app,
                name=config.name,
                tags=config.tags,
                auth_hook=forward_auth_headers_hook,
            )

    async def list_tools(self, *, agent_name: AgentName) -> list[AgentToolRead]:
        """The tools (DATS endpoints) of the agent and whether they need approval."""
        tools = await self.mcp_servers[agent_name].list_tools(run_middleware=False)
        return [
            AgentToolRead(
                name=tool.name,
                description=tool.description,
                needs_approval=requires_approval(
                    tool.annotations.model_dump(by_alias=True)
                    if tool.annotations
                    else None
                ),
            )
            for tool in tools
        ]

    async def run_agent(
        self,
        *,
        user_id: int,
        project_id: int,
        agent_name: AgentName,
        query: AgentQueryRequest,
        model: str | None,
        auth_headers: dict[str, str],
    ) -> AgentQueryResponse:
        """Answer a prompt in a (new or existing) session of the project; the
        history is stored on the server."""
        model_name = model or DEFAULT_MODEL
        selected_model = await self._resolve_model(model_name)
        session_id = (query.session_id or "").strip() or str(uuid.uuid4())

        # 1) read the history of the session
        history = await run_in_threadpool(
            self._read_history,
            user_id=user_id,
            project_id=project_id,
            session_id=session_id,
        )
        if _pending_approvals(history):
            raise AgentSessionPendingApprovalError(session_id)
        instructions = await run_in_threadpool(self._project_instructions, project_id)

        # 2) run the agent with the user's credentials
        try:
            with auth_headers_context(auth_headers):
                result = await self.agents[agent_name].run(
                    query.prompt,
                    message_history=history,
                    model=selected_model,
                    toolsets=[self._toolset(agent_name)],
                    instructions=instructions,
                )
        except (ModelAPIError, UnexpectedModelBehavior) as e:
            raise to_client_error(e) from e

        # 3) store the history, title a new session
        session, is_new = await run_in_threadpool(
            self._store_messages,
            user_id=user_id,
            project_id=project_id,
            agent_name=agent_name,
            session_id=session_id,
            messages=result.all_messages(),
        )
        if is_new:
            session = await self.title_session(
                user_id=user_id, session_id=session_id, model_name=model_name
            )
        logger.info(f"Agent [{agent_name.value}] answered in session [{session_id}].")

        # tool calls waiting for approval are not "used" yet
        output = result.output
        pending = (
            {call.tool_call_id for call in output.approvals}
            if isinstance(output, DeferredToolRequests)
            else set()
        )
        return AgentQueryResponse(
            session_id=session_id,
            response="" if isinstance(output, DeferredToolRequests) else output,
            tools_used=[
                part.tool_name
                for message in result.new_messages()
                for part in message.parts
                if isinstance(part, ToolCallPart) and part.tool_call_id not in pending
            ],
            approvals_required=[
                call.tool_name
                for call in (
                    output.approvals if isinstance(output, DeferredToolRequests) else []
                )
            ],
            session=session,
        )

    async def start_agui_run(
        self,
        *,
        user_id: int,
        project_id: int,
        agent_name: AgentName,
        run_input: RunAgentInput,
        accept: str | None,
        auth_headers: dict[str, str],
    ) -> AgentRunStream:
        """Start an AG-UI run: store the client's thread (with the new prompt) in
        the session, and return the run's events, which run the agent while they
        are read. The client sends the whole thread with every run."""
        session_id = run_input.thread_id
        if len(session_id) > SESSION_ID_MAX_LENGTH:
            raise AgentSessionIdInvalidError(SESSION_ID_MAX_LENGTH)
        forwarded_props = run_input.forwarded_props
        requested_model = (
            forwarded_props.get("modelName")
            if isinstance(forwarded_props, dict)
            else None
        )
        model_name = (
            requested_model if isinstance(requested_model, str) else DEFAULT_MODEL
        )
        selected_model = await self._resolve_model(model_name)
        adapter = AgentAGUIAdapter(
            agent=self.agents[agent_name],
            run_input=run_input,
            accept=accept,
            # the client sends no files; no URLs for the server to fetch
            allowed_file_url_schemes=frozenset(),
        )

        # 1) store the thread first: a stopped or failed run keeps the prompt
        session, is_new = await run_in_threadpool(
            self._store_messages,
            user_id=user_id,
            project_id=project_id,
            agent_name=agent_name,
            session_id=session_id,
            messages=adapter.messages,
        )
        instructions = await run_in_threadpool(self._project_instructions, project_id)
        toolset = self._toolset(agent_name)

        # 2) the run: store its messages when it completes
        async def on_complete(result: AgentRunResult[Any]) -> None:
            await run_in_threadpool(
                self._store_messages,
                user_id=user_id,
                project_id=project_id,
                agent_name=agent_name,
                session_id=session_id,
                messages=result.all_messages(),
            )
            logger.info(f"Agent [{agent_name.value}] finished session [{session_id}].")

        async def events() -> AsyncIterator[str]:
            # the toolset connects inside the run, so its MCP server task and
            # every tool call inherit this run's credentials
            with auth_headers_context(auth_headers):
                stream = adapter.run_stream(
                    model=selected_model,
                    toolsets=[toolset],
                    instructions=instructions,
                    on_complete=on_complete,
                )
                async for chunk in adapter.encode_stream(stream):
                    yield chunk

        return AgentRunStream(
            events=events(),
            content_type=adapter.build_event_stream().content_type,
            session=session,
            needs_title=is_new,
            model_name=model_name,
        )

    async def title_session(
        self, *, user_id: int, session_id: str, model_name: str
    ) -> AgentSessionRead:
        """Give a new session a title generated from its first prompt (until
        then, the prompt itself is its title)."""
        messages = await run_in_threadpool(
            self._read_messages, user_id=user_id, session_id=session_id
        )
        title = await self._generate_title(_first_prompt(messages), model_name)
        return await run_in_threadpool(
            self._update_title, user_id=user_id, session_id=session_id, title=title
        )

    def read_session(self, *, user_id: int, session_id: str) -> AgentSessionRead:
        """The user's session, read in a transaction of its own (after a run)."""
        with self.sqlr.transaction() as db:
            db_obj = crud_agent_session.read_by_user_and_session_id(
                db=db, user_id=user_id, session_id=session_id
            )
            return AgentSessionRead.model_validate(db_obj)

    def read_session_history(
        self, *, db: Session, user_id: int, session_id: str
    ) -> AgentSessionHistory:
        """The messages of the user's session as AG-UI messages. When its last run
        stopped for the user's approval, the assistant message with those tool
        calls carries the AG-UI interrupts, where the client restores them."""
        db_session = crud_agent_session.read_by_user_and_session_id(
            db=db, user_id=user_id, session_id=session_id
        )
        history = self._parse_history(db_session)
        messages = AGUIAdapter.dump_messages(history)

        pending = {call.tool_call_id: call for call in _pending_approvals(history)}
        if not pending:
            return AgentSessionHistory(messages=messages)
        for index in reversed(range(len(messages))):
            message = messages[index]
            if not isinstance(message, AssistantMessage) or not message.tool_calls:
                continue
            calls = [pending[c.id] for c in message.tool_calls if c.id in pending]
            if not calls:
                continue
            messages[index] = message.model_copy(
                update={
                    "metadata": {
                        "custom": {"agui": {"interrupts": approval_interrupts(calls)}}
                    }
                }
            )
            break
        return AgentSessionHistory(messages=messages)

    def _toolset(self, agent_name: AgentName) -> AbstractToolset[None]:
        """A new MCP toolset for one run. Runs never share a toolset: it connects
        once, with the credentials of the run that connects it."""
        return MCPToolset(
            self.mcp_servers[agent_name], max_retries=TOOL_MAX_RETRIES
        ).approval_required(_require_approval)

    async def _resolve_model(self, model: str) -> OpenAIChatModel:
        try:
            model_name = await run_in_threadpool(self.llm.validate_llm_name, model)
        except ValueError as e:
            raise UnknownAgentModelError(model) from e
        # Strict tool definitions make the provider force the tool schema, which
        # not every provider supports (some answer with HTTP 500). Without them,
        # pydantic-ai still validates the tool arguments and lets the LLM retry.
        return OpenAIChatModel(
            model_name=model_name,
            provider=self.provider,
            profile=OpenAIModelProfile(openai_supports_strict_tool_definition=False),
        )

    def _project_instructions(self, project_id: int) -> str:
        with self.sqlr.transaction() as db:
            project = crud_project.read(db=db, id=project_id)
            return (
                f'The user works in the DATS project "{project.title}" '
                f"(project id {project_id})."
            )

    def _read_history(
        self, *, user_id: int, project_id: int, session_id: str
    ) -> list[ModelMessage]:
        """The messages of the session; none for a new session."""
        with self.sqlr.transaction() as db:
            db_obj = crud_agent_session.read_by_user_and_session_id_if_exists(
                db=db, user_id=user_id, session_id=session_id
            )
            if db_obj is None:
                return []
            if db_obj.project_id != project_id:
                raise AgentSessionNotInProjectError(session_id, project_id)
            return self._parse_history(db_obj)

    def _read_messages(self, *, user_id: int, session_id: str) -> list[ModelMessage]:
        with self.sqlr.transaction() as db:
            db_obj = crud_agent_session.read_by_user_and_session_id(
                db=db, user_id=user_id, session_id=session_id
            )
            return self._parse_history(db_obj)

    def _store_messages(
        self,
        *,
        user_id: int,
        project_id: int,
        agent_name: AgentName,
        session_id: str,
        messages: Sequence[ModelMessage],
    ) -> tuple[AgentSessionRead, bool]:
        """Store the messages of the session; a new session gets the first prompt
        as title. Returns the session and whether it is new."""
        serialized = ModelMessagesTypeAdapter.dump_python(list(messages), mode="json")
        with self.sqlr.transaction() as db:
            db_obj = crud_agent_session.read_by_user_and_session_id_if_exists(
                db=db, user_id=user_id, session_id=session_id
            )
            if db_obj is not None:
                if db_obj.project_id != project_id:
                    raise AgentSessionNotInProjectError(session_id, project_id)
                db_obj = crud_agent_session.update(
                    db=db,
                    id=db_obj.id,
                    update_dto=AgentSessionUpdateIntern(messages=serialized),
                )
                return AgentSessionRead.model_validate(db_obj), False
            db_obj = crud_agent_session.create(
                db=db,
                create_dto=AgentSessionCreate(
                    session_id=session_id,
                    title=_prompt_title(_first_prompt(messages)),
                    user_id=user_id,
                    project_id=project_id,
                    agent_name=agent_name,
                    messages=serialized,
                ),
            )
            return AgentSessionRead.model_validate(db_obj), True

    def _update_title(
        self, *, user_id: int, session_id: str, title: str
    ) -> AgentSessionRead:
        with self.sqlr.transaction() as db:
            db_obj = crud_agent_session.read_by_user_and_session_id(
                db=db, user_id=user_id, session_id=session_id
            )
            db_obj = crud_agent_session.update(
                db=db, id=db_obj.id, update_dto=AgentSessionUpdateIntern(title=title)
            )
            return AgentSessionRead.model_validate(db_obj)

    def _parse_history(self, db_session: AgentSessionORM) -> list[ModelMessage]:
        try:
            return ModelMessagesTypeAdapter.validate_python(db_session.messages)
        except ValidationError as e:
            logger.error(
                f"Failed to parse the history of session {db_session.session_id}: {e}"
            )
            raise AgentSessionHistoryInvalidError(db_session.session_id) from e

    async def _generate_title(self, prompt: str, model_name: str) -> str:
        """Generate a short title for a session from its first prompt. Falls back
        to the prompt itself, because a missing title must not fail anything."""
        try:
            model = await self._resolve_model(model_name)
            result = await self.title_agent.run(
                f"Generate a title for a chat session starting with this prompt:\n\n{prompt}",
                model=model,
            )
            return result.output.title
        except Exception as e:
            logger.opt(exception=e).warning(f"Failed to generate a session title: {e}")
            return _prompt_title(prompt)
