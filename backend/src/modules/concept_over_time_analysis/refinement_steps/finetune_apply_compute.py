import shutil
from pathlib import Path

import numpy as np
from datasets import Dataset
from loguru import logger
from setfit import SetFitModel, Trainer, TrainingArguments
from sklearn.linear_model import LogisticRegression
from umap.umap_ import UMAP

from config import conf
from core.doc.sentence_embedding_crud import crud_sentence_embedding
from core.doc.sentence_embedding_dto import SentenceObjectIdentifier
from modules.concept_over_time_analysis.cota_dto import (
    COTARead,
    COTASentence,
)
from repos.filesystem_repo import FilesystemRepo
from repos.vector.weaviate_repo import WeaviateRepo

MODEL = conf.cota.model
BATCH_SIZE = conf.cota.batch_size


def finetune_apply_compute(
    device_str: str, cota: COTARead, search_space: list[COTASentence]
) -> list[COTASentence]:
    # 1. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
    if __has_min_concept_sentence_annotations(cota=cota, search_space=search_space):
        concept_ids: list[str] = [concept.id for concept in cota.concepts]
        model_path = FilesystemRepo().get_model_dir(
            proj_id=cota.project_id, model_name=str(cota.id), model_prefix="cota_"
        )

        # 1. train model
        model, sentences = __train_model(
            model_output_dir=model_path,
            device_str=device_str,
            concept_ids=concept_ids,
            search_space=search_space,
        )

        # 2. apply model
        embeddings, probabilities = __apply_model(model, sentences)

        # 3. compute results
        visual_refined_embeddings, concept_similarities = __compute_results(
            concept_ids=concept_ids,
            search_space=search_space,
            search_space_embeddings=embeddings,
        )

        # 4. remove the model files
        shutil.rmtree(model_path)

        # update search_space with the concept similarities
        for concept_id, similarities in concept_similarities.items():
            for sentence, similarity in zip(search_space, similarities):
                sentence.concept_similarities[concept_id] = similarity

    else:
        with WeaviateRepo().weaviate_session() as client:
            embeddings = crud_sentence_embedding.get_embeddings(
                client=client,
                project_id=cota.project_id,
                ids=[
                    SentenceObjectIdentifier(
                        sdoc_id=cota_sent.sdoc_id,
                        sentence_id=cota_sent.sentence_id,
                    )
                    for cota_sent in search_space
                ],
            )

        embeddings_tensor = np.array(embeddings)
        probabilities = [[0.5, 0.5] for _ in search_space]
        logger.debug("No model exists. We use weaviate embeddings.")
        # Visualize results: Reduce the refined embeddings with UMAP to 2D
        visual_refined_embeddings = __apply_umap(embs=embeddings_tensor, n_components=2)

    # 2. update search_space with the 2D coordinates
    for sentence, coordinates in zip(search_space, visual_refined_embeddings):
        sentence.x = coordinates[0]
        sentence.y = coordinates[1]

    # 3. update search_space with concept_probabilities
    for sentence, probabilities_outer in zip(search_space, probabilities):
        for concept, probability in zip(cota.concepts, probabilities_outer):
            sentence.concept_probabilities[concept.id] = probability

    return search_space


def __train_model(
    model_output_dir: Path,
    device_str: str,
    concept_ids: list[str],
    search_space: list[COTASentence],
) -> tuple[SetFitModel, list[str]]:
    sentences: list[str] = [ss.text for ss in search_space]

    # 1. Create the training data
    conceptid2label: dict[str, int] = {id: idx for idx, id in enumerate(concept_ids)}

    texts = []
    labels = []
    label_texts = []
    for ss_sentence, text in zip(search_space, sentences):
        if ss_sentence.concept_annotation:
            texts.append(text)
            labels.append(conceptid2label[ss_sentence.concept_annotation])
            label_texts.append(ss_sentence.concept_annotation)

    train_dataset = Dataset.from_dict(
        ({"text": texts, "label": labels, "label_text": label_texts})
    )

    texts = []
    labels = []
    label_texts = []
    count = 0
    for ss_sentence, text in zip(search_space, sentences):
        if ss_sentence.concept_annotation:
            texts.append(text)
            labels.append(conceptid2label[ss_sentence.concept_annotation])
            label_texts.append(ss_sentence.concept_annotation)
            count += 1

        if count >= BATCH_SIZE:
            break
    eval_dataset = Dataset.from_dict(
        (
            {
                "text": texts,
                "label": labels,
                "label_text": label_texts,
            }
        )
    )

    # 2. load a SetFit model from Hub
    logger.info(f"Loading COTA model {MODEL} on {device_str}")
    model = SetFitModel.from_pretrained(MODEL, device=device_str)

    # 3. init training
    args = TrainingArguments(
        batch_size=BATCH_SIZE,
        num_epochs=1,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        output_dir=str(model_output_dir),
        report_to="none",
    )
    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        metric="accuracy",
        column_mapping={
            "text": "text",
            "label": "label",
        },  # Map dataset columns to text/label expected by trainer
    )

    # 4. train
    trainer.train()

    return model, sentences


def __apply_model(
    model: SetFitModel, sentences: list[str]
) -> tuple[np.ndarray, list[list[float]]]:
    # 2. Embedd the search space sentences
    sentence_transformer = model.model_body
    if sentence_transformer is None:
        raise ValueError(f"Model {model} does not have a sentence_transformer!")
    sentence_transformer.eval()
    embeddings_tensor = sentence_transformer.encode(
        sentences=sentences,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    assert isinstance(embeddings_tensor, np.ndarray)

    # 3. Predict the probabilities for each concept
    regression_model = model.model_head
    assert isinstance(regression_model, LogisticRegression)
    probabilities = regression_model.predict_proba(embeddings_tensor).tolist()
    return embeddings_tensor, probabilities


def __compute_results(
    concept_ids: list[str],
    search_space: list[COTASentence],
    search_space_embeddings: np.ndarray,
) -> tuple[list[list[float]], dict[str, list[float]]]:
    # 1. rank search space sentences for each concept
    # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
    # 1.1 compute representation for each concept
    annotation_indices = __get_annotation_sentence_indices(
        concept_ids=concept_ids, search_space=search_space
    )
    concept_embeddings: dict[str, np.ndarray] = (
        dict()
    )  # dict[concept_id, concept_embedding]
    for concept_id in concept_ids:
        # the concept representation is the average of all annotated concept sentences
        concept_embeddings[concept_id] = search_space_embeddings[
            annotation_indices[concept_id]
        ].mean(axis=0)  # TODO: normalize??

    # 1.2  compute similarity of average representation to each sentence
    concept_similarities: dict[str, list[float]] = (
        dict()
    )  # dict[concept_id, list[similarity]]
    for concept_id, concept_embedding in concept_embeddings.items():
        sims = concept_embedding @ search_space_embeddings.T
        concept_similarities[concept_id] = sims.tolist()  # TODO normalize?

    # 2. Visualize results: Reduce the refined embeddings with UMAP to 2D
    # 2.1 reduce the dimensionality of the refined embeddings with UMAP
    visual_refined_embeddings = __apply_umap(
        embs=search_space_embeddings,
        n_components=2,
    )
    return visual_refined_embeddings, concept_similarities


def __get_annotation_sentence_indices(
    concept_ids: list[str], search_space: list[COTASentence]
) -> dict[str, list[int]]:
    """Returns the indices of the sentences in the search space that are annotated with a concept, for each concept"""

    annotations: dict[str, list[int]] = {concept_id: [] for concept_id in concept_ids}
    for idx, sentence in enumerate(search_space):
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(idx)
    return annotations


def __apply_umap(
    embs: np.ndarray,
    n_components: int,
) -> list[list[float]]:
    reducer = UMAP(n_components=n_components)
    reduced_embs = reducer.fit_transform(embs)
    assert isinstance(reduced_embs, np.ndarray)
    return reduced_embs.tolist()


def __has_min_concept_sentence_annotations(
    cota: COTARead,
    search_space: list[COTASentence],
) -> bool:
    """Returns true if each concept has at least min_required_annotations_per_concept"""

    annotations = __get_concept_sentence_annotations(
        cota=cota, search_space=search_space
    )

    for concept_annotations in annotations.values():
        if (
            len(concept_annotations)
            < cota.training_settings.min_required_annotations_per_concept
        ):
            return False

    return True


def __get_concept_sentence_annotations(
    cota: COTARead,
    search_space: list[COTASentence],
) -> dict[str, list[COTASentence]]:
    """Returns the sentences in the search space that are annotated with a concept, for each concept"""
    annotations: dict[str, list[COTASentence]] = {
        concept.id: [] for concept in cota.concepts
    }
    for sentence in search_space:
        if sentence.concept_annotation is not None:
            annotations[sentence.concept_annotation].append(sentence)
    return annotations
