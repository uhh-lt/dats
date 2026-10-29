import uuid
from collections.abc import AsyncIterator, Sequence
from typing import Any, NamedTuple

from fastapi import FastAPI
from fastmcp import FastMCP
from loguru import logger
from pydantic import ValidationError
from pydantic_ai import Agent
from pydantic_ai.exceptions import ModelAPIError
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.messages import (
    ModelMessage,
    ModelMessagesTypeAdapter,
    ModelRequest,
    ToolCallPart,
    UserPromptPart,
)
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.run import AgentRunResult
from pydantic_ai.tools import DeferredToolRequests, RunContext, ToolDefinition
from pydantic_ai.toolsets import AbstractToolset
from pydantic_ai.ui.ag_ui import AGUIAdapter
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
)
from modules.agent.agent_enum import AgentName
from modules.agent.agent_exceptions import (
    AgentLLMError,
    AgentSessionHistoryInvalidError,
    UnknownAgentModelError,
)
from modules.agent.agent_session_crud import crud_agent_session
from modules.agent.agent_session_dto import (
    AgentSessionCreate,
    AgentSessionUpdateIntern,
)
from modules.agent.agent_session_orm import AgentSessionORM
from modules.agent.auth_context_utils import (
    auth_header_context,
    forward_auth_header_hook,
)
from repos.llm_repo import LLMRepo
from systems.mcp_system.mcp_server import create_route_mapper

AgentOutput = str | DeferredToolRequests

TITLE_MAX_PROMPT_LENGTH = 50


class _AgentConfig(NamedTuple):
    tags: list[str]
    name: str
    system_prompt: str


_PROJECT_TAGS = ["project"]
_SOURCE_DOCUMENT_TAGS = ["sourceDocument"]
_ANNOTATION_TAGS = ["spanAnnotation", "bboxAnnotation", "sentenceAnnotation"]

_AGENT_CONFIGS: dict[AgentName, _AgentConfig] = {
    AgentName.PROJECT: _AgentConfig(
        tags=_PROJECT_TAGS,
        name="ProjectManagerAgent",
        system_prompt="You are an assistant specialized in project management.",
    ),
    AgentName.SOURCE_DOCUMENT: _AgentConfig(
        tags=_SOURCE_DOCUMENT_TAGS + _ANNOTATION_TAGS,
        name="SourceDocumentAgent",
        system_prompt="You are an assistant specialized in managing source documents.",
    ),
}

_TITLE_SYSTEM_PROMPT = (
    "You are an assistant specialized in generating concise and descriptive "
    "titles for sessions based on the user's prompt."
)


def _require_delete_approval(
    ctx: RunContext[Any],
    tool_def: ToolDefinition,
    tool_args: dict[str, Any],
) -> bool:
    return "delete" in tool_def.name.lower()


class AgentService(metaclass=SingletonMeta):
    def __new__(cls, *args, **kwargs):
        cls.llm: LLMRepo = LLMRepo()
        cls.provider: OpenAIProvider = OpenAIProvider(
            base_url=f"http://{conf.llm_provider.host}:{conf.llm_provider.port}/v1",
            api_key=conf.llm_provider.api_key,
        )
        cls.agents: dict[AgentName, Agent[None, AgentOutput]] = {}
        cls.toolsets: dict[AgentName, AbstractToolset[None]] = {}
        return super(AgentService, cls).__new__(cls)

    def initialize(self, app: FastAPI) -> None:
        """Build the agents. Each agent gets an MCP toolset made of the app's
        endpoints with the agent's tags. Called once by the app's lifespan."""
        default_model = self._resolve_model(conf.agent.model)
        logger.info(f"Default LLM model for agents: {default_model.model_name}")

        self.title_agent: Agent[None, AgentSessionTitle] = Agent(
            model=default_model,
            output_type=AgentSessionTitle,
            system_prompt=_TITLE_SYSTEM_PROMPT,
        )
        for agent_name, config in _AGENT_CONFIGS.items():
            mcp_server = FastMCP.from_fastapi(
                app=app,
                name=config.name,
                route_map_fn=create_route_mapper(config.tags),
                httpx_client_kwargs={
                    "event_hooks": {"request": [forward_auth_header_hook]}
                },
            )
            toolset = MCPToolset(mcp_server).approval_required(_require_delete_approval)
            self.toolsets[agent_name] = toolset
            self.agents[agent_name] = Agent(
                model=default_model,
                system_prompt=config.system_prompt,
                toolsets=[toolset],
                output_type=[str, DeferredToolRequests],
            )

    def list_models(self) -> list[str]:
        return self.llm.get_available_llms()

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
        except ModelAPIError as e:
            raise AgentLLMError() from e

        # 3) store the history
        await self._save_session(
            db=db,
            user_id=user_id,
            session_id=session_id,
            db_session=db_session,
            messages=result.all_messages(),
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

        adapter = await AGUIAdapter[None, AgentOutput].from_request(
            request, agent=agent
        )
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

        async def on_complete(result: AgentRunResult[Any]) -> None:
            await self._save_session(
                db=db,
                user_id=user_id,
                session_id=session_id,
                db_session=db_session,
                messages=result.all_messages(),
            )
            logger.info(f"Agent [{agent_name.value}] finished session [{session_id}].")

        with auth_header_context(auth_header):
            async with toolset:
                response = await AGUIAdapter.dispatch_request(
                    request,
                    agent=agent,
                    on_complete=on_complete,
                    model=selected_model,
                )
        if not isinstance(response, StreamingResponse):
            return response

        # the agent runs while the response streams, so keep the credentials
        # and the toolset until the stream ends
        body_iterator = response.body_iterator

        async def stream_with_auth_context() -> AsyncIterator[Any]:
            with auth_header_context(auth_header):
                async with toolset:
                    async for chunk in body_iterator:
                        yield chunk

        response.body_iterator = stream_with_auth_context()
        return response

    def read_session_history(
        self, *, db: Session, user_id: int, session_id: str
    ) -> AgentSessionHistory:
        db_session = crud_agent_session.read_by_user_and_session_id(
            db=db, user_id=user_id, session_id=session_id
        )
        messages = AGUIAdapter.dump_messages(self._parse_history(db_session))
        return AgentSessionHistory(
            messages=[m.model_dump(mode="json", by_alias=True) for m in messages]
        )

    def _resolve_model(self, model: str) -> OpenAIChatModel:
        try:
            model_name = self.llm.validate_llm_name(model)
        except ValueError as e:
            raise UnknownAgentModelError(model) from e
        return OpenAIChatModel(model_name=model_name, provider=self.provider)

    def _parse_history(self, db_session: AgentSessionORM) -> list[ModelMessage]:
        try:
            return ModelMessagesTypeAdapter.validate_python(db_session.messages)
        except ValidationError as e:
            logger.error(
                f"Failed to parse the history of session {db_session.session_id}: {e}"
            )
            raise AgentSessionHistoryInvalidError(db_session.session_id) from e

    async def _save_session(
        self,
        *,
        db: Session,
        user_id: int,
        session_id: str,
        db_session: AgentSessionORM | None,
        messages: Sequence[ModelMessage],
    ) -> None:
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
                title=await self._generate_title(messages),
                user_id=user_id,
                messages=serialized,
            ),
        )

    async def _generate_title(self, messages: Sequence[ModelMessage]) -> str:
        """Generate a short title from the first user prompt. Falls back to the
        prompt itself, because a missing title must not fail the agent run."""
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
        try:
            result = await self.title_agent.run(
                f"Generate a title for a chat session starting with this prompt:\n\n{prompt}"
            )
            return result.output.title
        except Exception as e:
            logger.warning(f"Failed to generate a session title: {e}")
            return prompt[:TITLE_MAX_PROMPT_LENGTH]
