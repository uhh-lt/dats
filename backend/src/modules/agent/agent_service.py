import re
import uuid
from collections.abc import AsyncIterator, Sequence
from typing import Any, NamedTuple

from ag_ui.core import AssistantMessage
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

# pydantic-ai's mapping of a pending approval to an AG-UI interrupt, so stored
# approvals get the same ids as live ones (the client answers them by id)
from pydantic_ai.ui.ag_ui._interrupt import approval_to_interrupt
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import Response, StreamingResponse

from common.singleton_meta import SingletonMeta
from config import conf
from modules.agent.agent_dto import (
    AgentQueryRequest,
    AgentQueryResponse,
    AgentSessionHistory,
    AgentSessionTitle,
    AgentToolRead,
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_exceptions import (
    AgentSessionHistoryInvalidError,
    UnknownAgentModelError,
)
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import (
    AgentSessionCreate,
    AgentSessionUpdateIntern,
)
from modules.agent.agent_session_orm import AgentSessionORM
from modules.agent.agui_adapter_utils import (
    AgentAGUIAdapter,
    AgentOutput,
    context_instructions,
    to_client_error,
)
from modules.agent.auth_context_utils import (
    auth_header_context,
    forward_auth_header_hook,
)
from repos.llm_repo import LLMRepo
from systems.mcp_system.mcp_server import create_mcp_server, requires_approval

# the provider's first LLM, unless a request names another one
DEFAULT_MODEL = "default"

TITLE_MAX_PROMPT_LENGTH = 50

# Without strict tool definitions (see _resolve_model), LLMs get complex tool
# arguments (e.g. search filters) wrong more often; they may correct them
# this many times per tool call.
TOOL_MAX_RETRIES = 3


class _AgentConfig(NamedTuple):
    tags: list[str]
    name: str
    system_prompt: str


_COMMON_PROMPT = (
    "You work inside DATS, a web application in which research teams manage, "
    "search, annotate and analyze documents. Your tools are DATS endpoints; they "
    "act with the permissions of the user you talk to. Use them to look things "
    "up instead of guessing, and say so when a tool you would need is missing. "
    "Tools that delete or remove data ask the user for approval: call them "
    "directly when the user asks for such a change, do not ask in the chat first. "
    "Answer in the language of the user, briefly, and format with Markdown. "
    "DATS entities appear as Markdown links with the dats: scheme, "
    "[label](dats:<type>/<id>), where <type> is one of source_document, code, "
    "tag, span_annotation, sentence_annotation, bbox_annotation or project and "
    "<id> is the entity's id. The user mentions entities this way. When you "
    "mention a DATS entity whose id you know, write it the same way, e.g. "
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
    """The first prompt of the user, with DATS links ([label](dats:type/id)) as their label."""
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
    return re.sub(r"\[([^\]]+)\]\(dats:[a-z_]+/\d+\)", r"\1", prompt)


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
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.provider: OpenAIProvider = OpenAIProvider(
            base_url=f"http://{conf.llm_provider.host}:{conf.llm_provider.port}/v1",
            api_key=conf.llm_provider.api_key,
        )
        cls.agents: dict[AgentName, Agent[None, AgentOutput]] = {}
        cls.toolsets: dict[AgentName, AbstractToolset[None]] = {}
        cls.mcp_servers: dict[AgentName, FastMCP] = {}
        return super(AgentService, cls).__new__(cls)

    def initialize(self, app: FastAPI) -> None:
        """Build the agents. Each agent gets an MCP toolset made of the app's
        MCP tools with the agent's tags. Called once by the app's lifespan."""
        default_model = self._resolve_model(DEFAULT_MODEL)
        logger.info(f"Default LLM model for agents: {default_model.model_name}")

        # a JSON answer instead of a forced tool call, which not every
        # provider supports
        self.title_agent: Agent[None, AgentSessionTitle] = Agent(
            model=default_model,
            output_type=PromptedOutput(AgentSessionTitle),
            system_prompt=_TITLE_SYSTEM_PROMPT,
        )
        for agent_name, config in _AGENT_CONFIGS.items():
            mcp_server = create_mcp_server(
                app=app,
                name=config.name,
                tags=config.tags,
                auth_hook=forward_auth_header_hook,
            )
            toolset = MCPToolset(
                mcp_server, max_retries=TOOL_MAX_RETRIES
            ).approval_required(_require_approval)
            self.mcp_servers[agent_name] = mcp_server
            self.toolsets[agent_name] = toolset
            self.agents[agent_name] = Agent(
                model=default_model,
                system_prompt=config.system_prompt,
                toolsets=[toolset],
                output_type=[str, DeferredToolRequests],
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
        db: Session,
        user_id: int,
        agent_name: AgentName,
        query: AgentQueryRequest,
        model: str | None,
        auth_header: str | None,
    ) -> AgentQueryResponse:
        """Answer a prompt in a (new or existing) session; the history is stored
        on the server."""
        agent = self.agents[agent_name]
        toolset = self.toolsets[agent_name]
        selected_model = self._resolve_model(model) if model else None

        # 1) read the history of the session
        session_id = (query.session_id or "").strip() or str(uuid.uuid4())
        db_session = crud_agent_session.read_by_user_and_session_id_if_exists(
            db=db, user_id=user_id, session_id=session_id
        )
        history = self._parse_history(db_session) if db_session else []

        # 2) run the agent with the user's credentials
        try:
            with auth_header_context(auth_header):
                async with toolset:
                    result = await agent.run(
                        query.prompt, message_history=history, model=selected_model
                    )
        except (ModelAPIError, UnexpectedModelBehavior) as e:
            raise to_client_error(e) from e

        # 3) store the history
        messages = result.all_messages()
        self._save_session(
            db=db,
            user_id=user_id,
            agent_name=agent_name,
            session_id=session_id,
            db_session=db_session,
            messages=messages,
            title=await self._generate_title(messages) if db_session is None else None,
        )
        logger.info(f"Agent [{agent_name.value}] answered in session [{session_id}].")

        tools_used = [
            part.tool_name
            for message in result.new_messages()
            for part in message.parts
            if isinstance(part, ToolCallPart)
        ]
        if isinstance(result.output, DeferredToolRequests):
            return AgentQueryResponse(
                session_id=session_id,
                response="",
                tools_used=tools_used,
                approvals_required=[c.tool_name for c in result.output.approvals],
            )
        return AgentQueryResponse(
            session_id=session_id,
            response=result.output,
            tools_used=tools_used,
            approvals_required=[],
        )

    async def run_agui_agent(
        self,
        *,
        db: Session,
        user_id: int,
        agent_name: AgentName,
        request: Request,
        auth_header: str | None,
    ) -> Response:
        """Run an agent for an AG-UI request and stream its events. The client sends
        the whole thread, so the stored history only serves to reload a session."""
        agent = self.agents[agent_name]
        toolset = self.toolsets[agent_name]

        adapter = await AgentAGUIAdapter.from_request(request, agent=agent)
        session_id = adapter.run_input.thread_id
        forwarded_props = adapter.run_input.forwarded_props
        requested_model = (
            forwarded_props.get("modelName")
            if isinstance(forwarded_props, dict)
            else None
        )
        selected_model = (
            self._resolve_model(requested_model)
            if isinstance(requested_model, str)
            else None
        )
        db_session = crud_agent_session.read_by_user_and_session_id_if_exists(
            db=db, user_id=user_id, session_id=session_id
        )

        completed = False

        async def on_complete(result: AgentRunResult[Any]) -> None:
            nonlocal completed
            completed = True
            messages = result.all_messages()
            self._save_session(
                db=db,
                user_id=user_id,
                agent_name=agent_name,
                session_id=session_id,
                db_session=db_session,
                messages=messages,
                title=await self._generate_title(messages)
                if db_session is None
                else None,
            )
            logger.info(f"Agent [{agent_name.value}] finished session [{session_id}].")

        with auth_header_context(auth_header):
            async with toolset:
                response = await AgentAGUIAdapter.dispatch_request(
                    request,
                    agent=agent,
                    on_complete=on_complete,
                    model=selected_model,
                    instructions=context_instructions(adapter.run_input.context),
                )
        if not isinstance(response, StreamingResponse):
            return response

        # the agent runs while the response streams, so keep the credentials
        # and the toolset until the stream ends
        body_iterator = response.body_iterator

        async def stream_with_auth_context() -> AsyncIterator[Any]:
            try:
                with auth_header_context(auth_header):
                    async with toolset:
                        async for chunk in body_iterator:
                            yield chunk
            finally:
                # A stopped (or failed) run never completes, so pydantic-ai has no
                # result to store. Store the thread the client sent instead, so the
                # prompt survives; the partial answer is lost. This runs while the
                # stream is cancelled, so it must not await (no generated title).
                if not completed:
                    messages = adapter.messages
                    self._save_session(
                        db=db,
                        user_id=user_id,
                        agent_name=agent_name,
                        session_id=session_id,
                        db_session=db_session,
                        messages=messages,
                        title=_first_prompt(messages)[:TITLE_MAX_PROMPT_LENGTH]
                        if db_session is None
                        else None,
                    )
                    logger.info(
                        f"Agent [{agent_name.value}] stopped in session [{session_id}]."
                    )

        response.body_iterator = stream_with_auth_context()
        return response

    def read_session_history(
        self, *, db: Session, user_id: int, session_id: str
    ) -> AgentSessionHistory:
        db_session = crud_agent_session.read_by_user_and_session_id(
            db=db, user_id=user_id, session_id=session_id
        )
        history = self._parse_history(db_session)
        messages = AGUIAdapter.dump_messages(history)

        # the run stopped for the user's approval: attach the interrupts to the
        # assistant message with these tool calls, where the client restores them
        pending = {call.tool_call_id: call for call in _pending_approvals(history)}
        if pending:
            for index in reversed(range(len(messages))):
                message = messages[index]
                if not isinstance(message, AssistantMessage) or not message.tool_calls:
                    continue
                calls = [pending[c.id] for c in message.tool_calls if c.id in pending]
                if not calls:
                    continue
                interrupts = [
                    approval_to_interrupt(call, {}).model_dump(
                        by_alias=True, exclude_none=True
                    )
                    for call in calls
                ]
                messages[index] = message.model_copy(
                    update={
                        "metadata": {"custom": {"agui": {"interrupts": interrupts}}}
                    }
                )
                break
        return AgentSessionHistory(messages=messages)

    def _resolve_model(self, model: str) -> OpenAIChatModel:
        try:
            model_name = self.llm.validate_llm_name(model)
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

    def _parse_history(self, db_session: AgentSessionORM) -> list[ModelMessage]:
        try:
            return ModelMessagesTypeAdapter.validate_python(db_session.messages)
        except ValidationError as e:
            logger.error(
                f"Failed to parse the history of session {db_session.session_id}: {e}"
            )
            raise AgentSessionHistoryInvalidError(db_session.session_id) from e

    def _save_session(
        self,
        *,
        db: Session,
        user_id: int,
        agent_name: AgentName,
        session_id: str,
        db_session: AgentSessionORM | None,
        messages: Sequence[ModelMessage],
        title: str | None,
    ) -> None:
        """Store the messages of the session; a new session also gets `title`."""
        serialized = ModelMessagesTypeAdapter.dump_python(list(messages), mode="json")
        if db_session is not None:
            crud_agent_session.update(
                db=db,
                id=db_session.id,
                update_dto=AgentSessionUpdateIntern(messages=serialized),
            )
            return

        crud_agent_session.create(
            db=db,
            create_dto=AgentSessionCreate(
                session_id=session_id,
                title=title,
                user_id=user_id,
                agent_name=agent_name,
                messages=serialized,
            ),
        )

    async def _generate_title(self, messages: Sequence[ModelMessage]) -> str:
        """Generate a short title from the first user prompt. Falls back to the
        prompt itself, because a missing title must not fail the agent run."""
        prompt = _first_prompt(messages)
        try:
            result = await self.title_agent.run(
                f"Generate a title for a chat session starting with this prompt:\n\n{prompt}"
            )
            return result.output.title
        except Exception as e:
            logger.warning(f"Failed to generate a session title: {e}")
            return prompt[:TITLE_MAX_PROMPT_LENGTH]
