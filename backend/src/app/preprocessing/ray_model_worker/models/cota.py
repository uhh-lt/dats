import logging
from pathlib import Path
from typing import Dict, List

from datasets import Dataset
from dto.cota import RayCOTARefinementJob, RayCOTASentence
from ray import serve
from ray_config import build_ray_model_deployment_config, conf
from setfit import SetFitModel, Trainer, TrainingArguments

cc = conf.cota

MODEL = cc.model
DEVICE = cc.device
BATCH_SIZE = cc.batch_size

SHARED_REPO_ROOT: Path = Path(conf.repo_root)

LOGGER = logging.getLogger("ray.serve")

cota_conf = build_ray_model_deployment_config("cota")


@serve.deployment(**cota_conf)
class CotaModel:
    def refinement(self, input: RayCOTARefinementJob) -> RayCOTARefinementJob:
        # Only train if we have enough annotated data
        if not self.__has_min_concept_sentence_annotations(input):
            return input

        search_space: List[RayCOTASentence] = input.search_space
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
            ({"text": texts, "label": labels, "label_text": label_texts})
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
        return input

    def __has_min_concept_sentence_annotations(
        self, cargo: RayCOTARefinementJob
    ) -> bool:
        """Returns true if each concept has at least min_required_annotations_per_concept"""

        annotations = self.__get_concept_sentence_annotations(cargo)

        for concept_annotations in annotations.values():
            if len(concept_annotations) < cargo.min_required_annotations_per_concept:
                return False

        return True

    def __get_concept_sentence_annotations(
        self, job: RayCOTARefinementJob
    ) -> Dict[str, List[RayCOTASentence]]:
        """Returns the sentences in the search space that are annotated with a concept, for each concept"""
        annotations: Dict[str, List[RayCOTASentence]] = {
            id: [] for id in job.concept_ids
        }
        for sentence in job.search_space:
            if sentence.concept_annotation is not None:
                annotations[sentence.concept_annotation].append(sentence)
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
