from enum import Enum
from typing import Any, NamedTuple

from fastapi import FastAPI
from fastmcp import FastMCP
from loguru import logger
from mcp_server import create_route_mapper
from pydantic import BaseModel, Field
from pydantic_ai import Agent
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.tools import DeferredToolRequests, RunContext, ToolDefinition

from config import conf
from modules.agent.auth_context_utils import forward_auth_header_hook
from repos.llm_repo import LLMRepo


class AgentName(str, Enum):
    TITLE_GENERATOR = "title_generator"
    PROJECT = "project"
    SOURCE_DOCUMENT = "source_document"


class ToolsetConfig(NamedTuple):
    tags: list[str]


class AgentConfig(NamedTuple):
    tools: list[ToolsetConfig]
    agent_name: str
    system_prompt: str


class SessionTitle(BaseModel):
    title: str = Field(
        description="A concise, 3 to 6 word descriptive title for the chat session.",
        max_length=60,
    )


TOOLSET_REGISTRY: dict[str, ToolsetConfig] = {
    "project": ToolsetConfig(
        tags=["project"],
    ),
    "source_document": ToolsetConfig(
        tags=["sourceDocument"],
    ),
    "annotation": ToolsetConfig(
        tags=["spanAnnotation", "bboxAnnotation", "sentenceAnnotation"],
    ),
}

AGENT_REGISTRY: dict[AgentName, AgentConfig] = {
    AgentName.PROJECT: AgentConfig(
        tools=[TOOLSET_REGISTRY["project"]],
        agent_name="ProjectManagerAgent",
        system_prompt="You are an assistant specialized in project management.",
    ),
    AgentName.SOURCE_DOCUMENT: AgentConfig(
        tools=[TOOLSET_REGISTRY["source_document"], TOOLSET_REGISTRY["annotation"]],
        agent_name="SourceDocumentAgent",
        system_prompt="You are an assistant specialized in managing source documents.",
    ),
}

_shared_provider = OpenAIProvider(
    base_url=f"http://{conf.llm_provider.host}:{conf.llm_provider.port}/v1",
    api_key=conf.llm_provider.api_key,
)

_AGENT_INSTANCES: dict[
    AgentName, Agent[object, str | DeferredToolRequests | SessionTitle]
] = {}
_TOOLSET_CACHE: dict[AgentName, MCPToolset] = {}


def require_delete_approval(
    ctx: RunContext | None,
    tool_def: ToolDefinition,
    tool_args: dict[str, Any] | None = None,
) -> bool:
    return "delete" in tool_def.name.lower()


def _get_pydantic_model(
    model_name: str = "vllm/google/gemma-4-31B-it",
) -> OpenAIChatModel:
    llm_repo = LLMRepo()
    if not llm_repo.get_available_llms():
        llm_repo.connect()

    resolved_model_name = llm_repo._validate_llm_name(model_name)
    return OpenAIChatModel(model_name=resolved_model_name, provider=_shared_provider)


def init_agent_toolsets(app: FastAPI):
    default_model = _get_pydantic_model()
    _AGENT_INSTANCES[AgentName.TITLE_GENERATOR] = Agent(
        model=default_model,
        output_type=SessionTitle,
        system_prompt=(
            "You are an assistant specialized in generating concise and descriptive "
            "titles for sessions based on the user's prompt."
        ),
    )
    logger.info(f"Default LLM model for agents: {default_model.model_name}")
    for agent_name, config in AGENT_REGISTRY.items():
        agent_tags: list[str] = []
        for toolset_config in config.tools:
            agent_tags.extend(toolset_config.tags)
        mcp_server = FastMCP.from_fastapi(
            app=app,
            name=config.agent_name,
            route_map_fn=create_route_mapper(agent_tags),
            httpx_client_kwargs={
                "event_hooks": {"request": [forward_auth_header_hook]}
            },
        )
        base_toolset = MCPToolset(mcp_server)
        # wrap toolset with approval mechanism
        toolset = base_toolset.approval_required(require_delete_approval)
        _TOOLSET_CACHE[agent_name] = toolset  # type: ignore
        _AGENT_INSTANCES[agent_name] = Agent(
            model=default_model,
            system_prompt=config.system_prompt,
            toolsets=[toolset],
            output_type=[str, DeferredToolRequests],
        )


def get_agent_and_toolset(
    agent_name: AgentName,
) -> tuple[
    Agent[object, str | DeferredToolRequests | SessionTitle], MCPToolset[object]
]:
    agent = _AGENT_INSTANCES[agent_name]
    toolset = _TOOLSET_CACHE[agent_name]
    return agent, toolset


async def generate_session_title(first_prompt: str) -> str:
    """Generates a short descriptive title for a session based on the initial prompt."""
    try:
        title_agent = _AGENT_INSTANCES[AgentName.TITLE_GENERATOR]
        result = await title_agent.run(
            f"Generate a title for a chat session starting with this prompt:\n\n{first_prompt}"
        )
        return result.output.title  # type: ignore
    except Exception as e:
        logger.warning(f"Failed to auto-generate title: {e}")
        return first_prompt[:50]
