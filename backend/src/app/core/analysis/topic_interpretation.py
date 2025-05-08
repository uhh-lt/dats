from typing import List

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.data.crud.project import crud_project
from app.core.data.crud.topic_interpretation import crud_topic_interpretation
from app.core.data.dto.topic_info import TopicInfoRead, TopicWordInfo
from app.core.data.dto.topic_interpretation import TopicInterpretationCreate
from app.core.data.llm.ollama_service import OllamaService

ollama_service = OllamaService()


class OllamaTopicResponse(BaseModel):
    topic_name: str
    reasoning: str


class TopWordsTopic(BaseModel):
    topic_words: List[TopicWordInfo]
    topic_id: int


# Reads the Topics from the db, generated in Project: {project_id}
def top_words(db: Session, project_id: int) -> dict[int, TopWordsTopic]:
    project = crud_project.read(db=db, id=project_id)
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    return {
        key: TopWordsTopic(topic_words=topic_info.topic_words, topic_id=topic_info.id)
        for key, topic_info in enumerate(topic_infos)
    }


# TODO: change return type to dict similair to top_words()
def topic_distr(db: Session, project_id: int) -> list[dict]:
    topic_distr_data = []
    project = crud_project.read(db=db, id=project_id)
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    for topic_info in topic_infos:
        topic_distr_data.append({"count": topic_info.doc_count})
    return topic_distr_data


def sortFunc(e):
    return e.probability


# TODO: change return type to dict similair to top_words()
def document_info(project_id: int, db: Session, topic_id: int) -> list[dict]:
    document_info_data = []
    project = crud_project.read(db=db, id=project_id)
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    if topic_infos:
        topic_info = topic_infos[topic_id].topic_documents
        topic_info.sort(key=sortFunc, reverse=True)

        for topic_document in topic_info:
            document_info_data.append(topic_document.model_dump())

    return document_info_data


def get_prompt(top_words_data: List[TopicWordInfo]) -> list[str]:
    top_words_string = " ".join(point.word for point in top_words_data)

    user_prompt = (
        "Walter Kempowski (1929-2007) was a contemporary German author, collage artist, and archivist."
        "In his final major project, Ortslinien (initiated in 1997), he moved beyond traditional books to integrate text, images, sound, and film."
        "Kempowski organized his work into data folders labeled 'OL' (for Ortslinien), which reveal his planned structure for connecting these varied "
        "media types. His notes explain that Ortslinien is a mathematical term describing sets of points—'lines or areas on which all points lie that "
        "satisfy given conditions'—used here as an analogy for the interconnected elements of his work. The project's "
        "diverse materials (texts, photos, films, paintings, musical pieces) are arranged along a timeline to evoke a 'spatial sense of time.' Your colleagues have already run topic modeling on this dataset using BERTopic."
        f"Based on the following top words for a specific topic: '{top_words_string}' please provide a clear interpretation of what this topic might "
        "represent and suggest an appropriate topic name."
    )

    system_prompt = (
        "You are an expert in digital humanities with extensive experience in topic modeling, particularly using BERTopic."
        "Your current analysis focuses on Walter Kempowski's Ortslinien project—a complex work that intertwines various media "
        "to create a spatial narrative of time"
    )
    #    "{ 'topic_name': '<Your chosen umbrella term for the topic>', 'reasoning': '<A detailed explanation of your interpretation and the connection to the provided top words>' }"

    return [system_prompt, user_prompt]


def top_words_ollama(topic_num: int, db: Session, project_id: int) -> dict:
    top_words_data = top_words(db=db, project_id=project_id)

    if not top_words_data:
        return {
            "prompt": "noah_v1",
            "reasoning": "Topic-Modeling model has not been generated",
            "topic_name": "No Data",
            "top_words": [],
        }

    prompts = get_prompt(top_words_data=top_words_data[topic_num].topic_words)

    response = ollama_service.llm_chat(
        system_prompt=prompts[0],
        user_prompt=prompts[1],
        response_model=OllamaTopicResponse,
    )

    ollama_responses = {
        "prompt": "noah_v1",
        "reasoning": response.reasoning
        if type(response) is OllamaTopicResponse
        else "",
        "topic_name": response.topic_name
        if type(response) is OllamaTopicResponse
        else "",
        "top_words": [top_words_data[topic_num].topic_words],
    }

    crud_topic_interpretation.create(
        db=db,
        create_dto=TopicInterpretationCreate(
            topic_info_id=top_words_data[topic_num].topic_id,
            prompt_name=ollama_responses["prompt"],
            topic_name=ollama_responses["topic_name"],
            reasoning=ollama_responses["reasoning"],
        ),
    )

    return ollama_responses
