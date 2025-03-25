from typing import Dict, List

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


def top_words(db: Session, project_id: int) -> Dict[int, List[TopicWordInfo]]:
    # top_words_data = []
    ## TODO NOAH add project_id as a parameter to the hook & reset top_words_data / topic_distr_data
    # project = crud_project.read(db=db, id=project_id)
    ## umwandeln von orm zu dict/list json object
    # topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]
    #
    # for topic_info in topic_infos:
    #    topic_x_data = {}
    #    # alle wörter durchgehen
    #    for index, top_word in enumerate(topic_info.topic_words):
    #        topic_x_data[str(index)] = top_word.model_dump()
    #    top_words_data.append(topic_x_data)
    #
    # return top_words_data

    # TODO NOAH add project_id as a parameter to the hook & reset top_words_data / topic_distr_data
    project = crud_project.read(db=db, id=project_id)
    # umwandeln von orm zu dict/list json object
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    return {topic_info.id: topic_info.topic_words for topic_info in topic_infos}


def topic_distr(db: Session, project_id: int) -> list[dict]:
    topic_distr_data = []
    project = crud_project.read(db=db, id=project_id)
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    for topic_info in topic_infos:
        topic_distr_data.append({"count": topic_info.doc_count})
    return topic_distr_data


def sortFunc(e):
    return e.probability


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


def get_prompt(index: int, top_words_data: list):
    top_words_string = ""
    for point in top_words_data[index]:
        top_words_string += top_words_data[index][point]["word"] + " "

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
        "to create a spatial narrative of time. When responding, please adhere to the following format: "
        "{ 'topic_name': '<Your chosen umbrella term for the topic>', 'reasoning': '<A detailed explanation of your interpretation and the connection to the provided top words>' }"
    )

    return [system_prompt, user_prompt]


def top_words_ollama(topic_id: int, db: Session, project_id: int) -> dict:
    top_words_data = top_words(db=db, project_id=project_id)

    if not top_words_data:
        return {
            "prompt": "noah_v1",
            "reasoning": "Topic-Modeling model has not been generated",
            "topic_name": "No Data",
            "top_words": [],
        }

    response = ollama_service.chat(
        *get_prompt(topic_id, top_words_data=["test"]),
        response_model=OllamaTopicResponse,
    )

    ollama_responses = {
        "prompt": "noah_v1",
        "reasoning": response.reasoning,
        "topic_name": response.topic_name,
        "top_words": [top_words_data[topic_id]],
    }

    project = crud_project.read(db=db, id=project_id)
    # umwandeln von orm zu dict/list json object
    topic_infos = [TopicInfoRead.model_validate(x) for x in project.topic_infos]

    crud_topic_interpretation.create(
        db=db,
        create_dto=TopicInterpretationCreate(
            topic_info_id=topic_infos[topic_id].id,
            prompt_name=ollama_responses["prompt"],
            topic_name=ollama_responses["topic_name"],
            reasoning=ollama_responses["reasoning"],
        ),
    )

    return ollama_responses
