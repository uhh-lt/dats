import logging
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from datasets import Dataset
from dto.cota import RayCOTAJobInput, RayCOTAJobResponse, RayCOTASentenceBase
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from setfit import SetFitModel, Trainer, TrainingArguments
from sklearn.linear_model import LogisticRegression
from umap.umap_ import UMAP

cc = conf.cota

MODEL = cc.model
DEVICE = cc.device
BATCH_SIZE = cc.batch_size

SHARED_REPO_ROOT: Path = Path(conf.repo_root)

LOGGER = logging.getLogger("ray.serve")

cota_conf: Dict = build_ray_model_deployment_config("cota")


@serve.deployment(**cota_conf)
class CotaModel:
    def finetune_apply_compute(self, input: RayCOTAJobInput) -> RayCOTAJobResponse:
        # 1 finetune
        sentences: List[str]
        model: SetFitModel
        model, sentences = self.__finetune(input)

        # 2 apply_st
        embeddings: np.ndarray
        probabilities: List[List[float]]
        embeddings, probabilities = self.__apply_st(model, sentences)

        # 3 compute results
        visual_refined_embeddings: List[List[float]]
        concept_similarities: Dict[str, List[float]]
        visual_refined_embeddings, concept_similarities = self.__compute_results(
            input, embeddings
        )
        response: RayCOTAJobResponse = RayCOTAJobResponse(
            visual_refined_embeddings=visual_refined_embeddings,
            concept_similarities=concept_similarities,
            id=input.id,
            project_id=input.project_id,
            probabilities=probabilities,
        )
        return response

    def __finetune(self, input: RayCOTAJobInput) -> Tuple[SetFitModel, List[str]]:
        # Only train if we have enough annotated data
        if not self.__has_min_concept_sentence_annotations(input):
            raise ValueError(
                f"Expected input to have at least {input.min_required_annotations_per_concept} annotations, but got {input} instead."
            )

        search_space: List[RayCOTASentenceBase] = input.search_space
        sentences: List[str] = [ss.text for ss in search_space]

        # 1. Create the training data
        conceptid2label: Dict[str, int] = {
            id: idx for idx, id in enumerate(input.concept_ids)
        }

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
                    "labelfrom tempfile import TemporaryFile_text": label_texts,
                }
            )
        )

        # 2. load a SetFit model from Hub
        LOGGER.info(f"Loading COTA model {MODEL} on {DEVICE}")
        model = SetFitModel.from_pretrained(MODEL, device=DEVICE)

        # 3. init training
        model_name = str(input.id)
        model_path = self.__get_model_dir(
            proj_id=input.project_id, model_name=model_name
        )
        args = TrainingArguments(
            batch_size=BATCH_SIZE,
            num_epochs=1,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            output_dir=str(model_path),
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

        # 5. store model
        model_name = f"{input.id}-best-model"
        model_path = self.__get_model_dir(
            proj_id=input.project_id, model_name=model_name
        )
        model.save_pretrained(model_path)
        return model, sentences

    def __apply_st(
        self, model: SetFitModel, sentences: List[str]
    ) -> Tuple[np.ndarray, List[List[float]]]:
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
        self,
        input: RayCOTAJobInput,
        search_space_embeddings: np.ndarray,
    ) -> Tuple[List[List[float]], Dict[str, List[float]]]:
        # 2. rank search space sentences for each concept
        # this can only be done if a concept has sentence annotations, because we need those to compute the concept representation
        # if we do not have sentence annotations, the ranking / similarities were already computed by the initial simsearch (in the first step)
        if not self.__has_min_concept_sentence_annotations(input):
            raise ValueError("not enough annotations")
        # 2.1 compute representation for each concept
        annotation_indices = self.__get_concept_sentence_indices(input)
        concept_embeddings: Dict[str, np.ndarray] = (
            dict()
        )  # Dict[concept_id, concept_embedding]
        for concept_id in input.concept_ids:
            # the concept representation is the average of all annotated concept sentences
            concept_embeddings[concept_id] = search_space_embeddings[
                annotation_indices[concept_id]
            ].mean(axis=0)  # TODO: normalize??

        # 2.2  compute similarity of average representation to each sentence
        concept_similarities: Dict[str, List[float]] = (
            dict()
        )  # Dict[concept_id, List[similarity]]
        for concept_id, concept_embedding in concept_embeddings.items():
            sims = concept_embedding @ search_space_embeddings.T
            concept_similarities[concept_id] = sims.tolist()  # TODO normalize?

        # 3. Visualize results: Reduce the refined embeddings with UMAP to 2D
        # 3.1 reduce the dimensionality of the refined embeddings with UMAP

        visual_refined_embeddings = self.__apply_umap(
            embs=search_space_embeddings, n_components=2, return_list=True
        )
        return visual_refined_embeddings, concept_similarities

    def __has_min_concept_sentence_annotations(self, cargo: RayCOTAJobInput) -> bool:
        """Returns true if each concept has at least min_required_annotations_per_concept"""

        annotations = self.__get_concept_sentence_annotations(cargo)

        for concept_annotations in annotations.values():
            if len(concept_annotations) < cargo.min_required_annotations_per_concept:
                return False

        return True

    def __get_concept_sentence_annotations(
        self, job: RayCOTAJobInput
    ) -> Dict[str, List[RayCOTASentenceBase]]:
        """Returns the sentences in the search space that are annotated with a concept, for each concept"""
        annotations: Dict[str, List[RayCOTASentenceBase]] = {
            id: [] for id in job.concept_ids
        }
        for sentence in job.search_space:
            if sentence.concept_annotation is not None:
                annotations[sentence.concept_annotation].append(sentence)
        return annotations

    def __get_concept_sentence_indices(
        self, job: RayCOTAJobInput
    ) -> Dict[str, List[int]]:
        """Returns the indices of the sentences in the search space that are annotated with a concept, for each concept"""

        annotations: Dict[str, List[int]] = {
            concept_id: [] for concept_id in job.concept_ids
        }
        for idx, sentence in enumerate(job.search_space):
            if sentence.concept_annotation is not None:
                annotations[sentence.concept_annotation].append(idx)
        return annotations

    def __get_project_repo_root_path(self, proj_id: int) -> Path:
        return SHARED_REPO_ROOT.joinpath(f"projects/{proj_id}/")

    def __get_models_root_path(self, proj_id: int) -> Path:
        return self.__get_project_repo_root_path(proj_id=proj_id).joinpath("models")

    def __get_model_dir(
        self,
        proj_id: int,
        model_name: str,
        model_prefix: str = "cota_",
    ) -> Path:
        name = (
            self.__get_models_root_path(proj_id=proj_id) / f"{model_prefix}{model_name}"
        )
        return name

    def __apply_umap(
        self,
        embs: np.ndarray,
        n_components: int,
        return_list: bool = True,
    ) -> List[List[float]]:
        reducer = UMAP(n_components=n_components)
        reduced_embs = reducer.fit_transform(embs)
        assert isinstance(reduced_embs, np.ndarray)
        return reduced_embs.tolist()

    def __get_embeddings_root_path(self, proj_id: int) -> Path:
        return self.__get_project_repo_root_path(proj_id=proj_id).joinpath("embeddings")

    def __get_probabilities_root_path(self, proj_id: int) -> Path:
        return self.__get_project_repo_root_path(proj_id=proj_id).joinpath(
            "probabilities"
        )

    def get_embeddings_filename(
        self,
        proj_id: int,
        embedding_name: str,
        embeddings_prefix: str = "cota_",
    ) -> Path:
        return (
            self.__get_embeddings_root_path(proj_id=proj_id)
            / f"{embeddings_prefix}{embedding_name}.npy"
        )

    def get_probabilities_filename(
        self,
        proj_id: int,
        probability_name: str,
        probabilities_s_prefix: str = "cota_",
    ) -> Path:
        return (
            self.__get_probabilities_root_path(proj_id=proj_id)
            / f"{probabilities_s_prefix}{probability_name}.npy"
        )

    def _store_embeddings_probabilities(
        self, id: int, proj_id: int, embeddings: np.ndarray, probabilities: np.ndarray
    ) -> Tuple[Path, Path]:
        if not isinstance(embeddings, np.ndarray):
            raise ValueError(
                f"Embeddings must be of type np.ndarray, but was {type(embeddings)}"
            )
        name = str(id)
        embeddings_path = self.get_embeddings_filename(
            proj_id=proj_id, embedding_name=name
        )
        embeddings_path.parent.mkdir(exist_ok=True, parents=True)
        with open(embeddings_path, "wb+") as f:
            np.save(f, embeddings)
        LOGGER.debug(
            f"Stored embeddings of shape {embeddings.shape} at {embeddings_path}!"
        )
        probabilities_path = self.get_probabilities_filename(
            proj_id=proj_id, probability_name=name
        )
        probabilities_path.parent.mkdir(exist_ok=True, parents=True)
        with open(probabilities_path, "wb+") as f:
            np.save(f, probabilities)
        LOGGER.debug(
            f"Stored probabilities of shape {probabilities.shape} at {probabilities_path}!"
        )
        return embeddings_path, probabilities_path
