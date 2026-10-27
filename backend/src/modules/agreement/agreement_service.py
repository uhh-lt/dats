from typing import NamedTuple

import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session

from common.singleton_meta import SingletonMeta
from core.annotation.annotation_document_orm import AnnotationDocumentORM
from core.annotation.sentence_annotation_orm import SentenceAnnotationORM
from core.annotation.span_annotation_orm import SpanAnnotationORM
from core.code.code_orm import CodeORM
from core.doc.source_document_data_orm import SourceDocumentDataORM
from core.doc.source_document_orm import SourceDocumentORM
from core.project.project_orm import ProjectUserLinkTable
from core.user.user_orm import UserORM
from modules.agreement.agreement_dto import (
    AgreementCodeScore,
    AgreementParams,
    AgreementResult,
    AgreementScore,
    AgreementSegment,
)
from modules.agreement.agreement_enum import AgreementMode
from modules.agreement.agreement_exceptions import (
    AgreementAnnotatorsNotInProjectError,
    AgreementCodesNotInProjectError,
    AgreementSdocsNotInProjectError,
)
from repos.filesystem_repo import FilesystemRepo

# A unit is identified by a pair of ints, so that all modes share one algorithm:
# - SPAN_STRICT: (begin, end) character offsets of the span
# - SPAN_WORD:   (token, token + 1)
# - SENTENCE:    (sentence, sentence)
# In the word and sentence modes, unit (i, ...) follows unit (i - 1, ...) directly.
_UnitKey = tuple[int, int]


class _Annotation(NamedTuple):
    id: int
    sdoc_id: int
    user_id: int
    code_id: int
    units: list[_UnitKey]
    token_range: tuple[int, int] | None


class _SdocText(NamedTuple):
    content: str
    token_starts: list[int]
    token_ends: list[int]
    sentence_starts: list[int]
    sentence_ends: list[int]


class _UnitCodes(NamedTuple):
    # code id -> ids of the annotations that assign the code to the unit
    reference: dict[int, set[int]]
    compared: dict[int, set[int]]


class _Counts(NamedTuple):
    tp: int
    fp: int
    fn: int


class AgreementService(metaclass=SingletonMeta):
    """Compares the annotations of two annotators (inter-annotator agreement).

    The annotations are split into units (words, spans or sentences, see
    `AgreementMode`). Every code is scored separately per unit: a unit that carries
    code A in the reference and codes A and B in the comparison is a true positive
    for A and a false positive for B. Annotations are never excluded, except by
    the requested documents, codes and annotators.
    """

    def __new__(cls, *args, **kwargs):
        cls.fsr: FilesystemRepo = FilesystemRepo()
        return super(AgreementService, cls).__new__(cls)

    def compute_agreement(
        self, *, db: Session, project_id: int, params: AgreementParams
    ) -> AgreementResult:
        # 1) validate the input
        sdoc_ids = list(dict.fromkeys(params.sdoc_ids))
        code_ids = list(dict.fromkeys(params.code_ids))
        self._read_sdoc_names(db=db, project_id=project_id, sdoc_ids=sdoc_ids)
        self._read_code_names(db=db, project_id=project_id, code_ids=code_ids)
        self._read_annotator_names(db=db, project_id=project_id, params=params)

        # 2) compare the annotations unit by unit
        segments = self._compute_segments(
            db=db, sdoc_ids=sdoc_ids, code_ids=code_ids, params=params
        )

        # 3) aggregate the segments to scores and the confusion matrix
        return self._aggregate(params=params, code_ids=code_ids, segments=segments)

    def export_counts(
        self, *, db: Session, project_id: int, params: AgreementParams
    ) -> str:
        """Exports the raw counts (TP, FP, FN) per document and code as CSV.

        Every pair of requested document and code is a row, also if all its
        counts are zero. Returns the relative URL of the CSV file.
        """
        # 1) validate the input
        sdoc_ids = list(dict.fromkeys(params.sdoc_ids))
        code_ids = list(dict.fromkeys(params.code_ids))
        sdoc_names = self._read_sdoc_names(
            db=db, project_id=project_id, sdoc_ids=sdoc_ids
        )
        code_names = self._read_code_names(
            db=db, project_id=project_id, code_ids=code_ids
        )
        user_names = self._read_annotator_names(
            db=db, project_id=project_id, params=params
        )

        # 2) count per document and code
        segments = self._compute_segments(
            db=db, sdoc_ids=sdoc_ids, code_ids=code_ids, params=params
        )
        counts: dict[tuple[int, int], list[int]] = {
            (sdoc_id, code_id): [0, 0, 0]
            for sdoc_id in sdoc_ids
            for code_id in code_ids
        }
        for segment in segments:
            for code_id in segment.true_positive_code_ids:
                counts[(segment.sdoc_id, code_id)][0] += segment.num_units
            for code_id in segment.false_positive_code_ids:
                counts[(segment.sdoc_id, code_id)][1] += segment.num_units
            for code_id in segment.false_negative_code_ids:
                counts[(segment.sdoc_id, code_id)][2] += segment.num_units

        # 3) write the CSV
        df = pd.DataFrame(
            data=[
                {
                    "mode": params.mode.value,
                    "reference_user_id": params.reference_user_id,
                    "reference_user": user_names[params.reference_user_id],
                    "compared_user_id": params.compared_user_id,
                    "compared_user": user_names[params.compared_user_id],
                    "sdoc_id": sdoc_id,
                    "sdoc_name": sdoc_names[sdoc_id],
                    "code_id": code_id,
                    "code_name": code_names[code_id],
                    "true_positives": tp,
                    "false_positives": fp,
                    "false_negatives": fn,
                }
                for (sdoc_id, code_id), (tp, fp, fn) in counts.items()
            ],
            columns=[
                "mode",
                "reference_user_id",
                "reference_user",
                "compared_user_id",
                "compared_user",
                "sdoc_id",
                "sdoc_name",
                "code_id",
                "code_name",
                "true_positives",
                "false_positives",
                "false_negatives",
            ],
        )
        export_file = self.fsr.write_df_to_temp_file(
            df=df, fn=f"project_{project_id}_agreement_counts"
        )
        return self.fsr.get_temp_file_url(export_file.name, relative=True)

    def _read_sdoc_names(
        self, *, db: Session, project_id: int, sdoc_ids: list[int]
    ) -> dict[int, str]:
        rows = db.execute(
            select(SourceDocumentORM.id, SourceDocumentORM.name).where(
                SourceDocumentORM.project_id == project_id,
                SourceDocumentORM.id.in_(sdoc_ids),
            )
        ).all()
        names = {sdoc_id: name for sdoc_id, name in rows}
        missing = [sdoc_id for sdoc_id in sdoc_ids if sdoc_id not in names]
        if missing:
            raise AgreementSdocsNotInProjectError(
                project_id=project_id, sdoc_ids=missing
            )
        return names

    def _read_annotator_names(
        self, *, db: Session, project_id: int, params: AgreementParams
    ) -> dict[int, str]:
        """Names of both annotators, who must be members of the project.

        Unknown users are reported like non-members, so that the error does not
        reveal which user IDs exist.
        """
        user_ids = list(
            dict.fromkeys([params.reference_user_id, params.compared_user_id])
        )
        rows = db.execute(
            select(UserORM.id, UserORM.first_name, UserORM.last_name)
            .join(ProjectUserLinkTable, ProjectUserLinkTable.user_id == UserORM.id)
            .where(
                ProjectUserLinkTable.project_id == project_id,
                UserORM.id.in_(user_ids),
            )
        ).all()
        names = {
            user_id: f"{first_name} {last_name}"
            for user_id, first_name, last_name in rows
        }
        missing = [user_id for user_id in user_ids if user_id not in names]
        if missing:
            raise AgreementAnnotatorsNotInProjectError(
                project_id=project_id, user_ids=missing
            )
        return names

    def _read_code_names(
        self, *, db: Session, project_id: int, code_ids: list[int]
    ) -> dict[int, str]:
        rows = db.execute(
            select(CodeORM.id, CodeORM.name).where(
                CodeORM.project_id == project_id,
                CodeORM.id.in_(code_ids),
            )
        ).all()
        names = {code_id: name for code_id, name in rows}
        missing = [code_id for code_id in code_ids if code_id not in names]
        if missing:
            raise AgreementCodesNotInProjectError(
                project_id=project_id, code_ids=missing
            )
        return names

    def _compute_segments(
        self,
        *,
        db: Session,
        sdoc_ids: list[int],
        code_ids: list[int],
        params: AgreementParams,
    ) -> list[AgreementSegment]:
        if not sdoc_ids or not code_ids:
            return []

        # 1) read the annotations of both annotators
        user_ids = [params.reference_user_id, params.compared_user_id]
        if params.mode == AgreementMode.SENTENCE:
            annotations = self._read_sentence_annotations(
                db=db, sdoc_ids=sdoc_ids, code_ids=code_ids, user_ids=user_ids
            )
        else:
            annotations = self._read_span_annotations(
                db=db,
                sdoc_ids=sdoc_ids,
                code_ids=code_ids,
                user_ids=user_ids,
                mode=params.mode,
            )

        # 2) collect the codes of every unit per document and annotator.
        # An annotator compared with themself is on both sides.
        units_by_sdoc: dict[int, dict[_UnitKey, _UnitCodes]] = {}
        token_ranges: dict[tuple[int, _UnitKey], tuple[int, int]] = {}
        for annotation in annotations:
            units = units_by_sdoc.setdefault(annotation.sdoc_id, {})
            for unit_key in annotation.units:
                unit = units.setdefault(unit_key, _UnitCodes({}, {}))
                if annotation.user_id == params.reference_user_id:
                    unit.reference.setdefault(annotation.code_id, set()).add(
                        annotation.id
                    )
                if annotation.user_id == params.compared_user_id:
                    unit.compared.setdefault(annotation.code_id, set()).add(
                        annotation.id
                    )
                if annotation.token_range is not None:
                    token_ranges.setdefault(
                        (annotation.sdoc_id, unit_key), annotation.token_range
                    )

        # 3) merge consecutive units with the same codes into segments
        texts = self._read_sdoc_texts(db=db, sdoc_ids=list(units_by_sdoc.keys()))
        code_order = {code_id: index for index, code_id in enumerate(code_ids)}
        segments: list[AgreementSegment] = []
        for sdoc_id in sdoc_ids:
            units = units_by_sdoc.get(sdoc_id)
            if not units:
                continue
            group: list[_UnitKey] = []
            for unit_key in sorted(units.keys()):
                if group and not self._continues_segment(
                    mode=params.mode,
                    previous=units[group[-1]],
                    previous_key=group[-1],
                    unit=units[unit_key],
                    unit_key=unit_key,
                ):
                    segments.append(
                        self._to_segment(
                            mode=params.mode,
                            sdoc_id=sdoc_id,
                            text=texts.get(sdoc_id),
                            group=group,
                            units=units,
                            token_ranges=token_ranges,
                            code_order=code_order,
                        )
                    )
                    group = []
                group.append(unit_key)
            segments.append(
                self._to_segment(
                    mode=params.mode,
                    sdoc_id=sdoc_id,
                    text=texts.get(sdoc_id),
                    group=group,
                    units=units,
                    token_ranges=token_ranges,
                    code_order=code_order,
                )
            )
        return segments

    def _read_span_annotations(
        self,
        *,
        db: Session,
        sdoc_ids: list[int],
        code_ids: list[int],
        user_ids: list[int],
        mode: AgreementMode,
    ) -> list[_Annotation]:
        rows = db.execute(
            select(
                SpanAnnotationORM.id,
                AnnotationDocumentORM.source_document_id,
                AnnotationDocumentORM.user_id,
                SpanAnnotationORM.code_id,
                SpanAnnotationORM.begin,
                SpanAnnotationORM.end,
                SpanAnnotationORM.begin_token,
                SpanAnnotationORM.end_token,
            )
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id == SpanAnnotationORM.annotation_document_id,
            )
            .where(
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                AnnotationDocumentORM.user_id.in_(user_ids),
                SpanAnnotationORM.code_id.in_(code_ids),
            )
        ).all()
        return [
            _Annotation(
                id=anno_id,
                sdoc_id=sdoc_id,
                user_id=user_id,
                code_id=code_id,
                units=(
                    [(begin, end)]
                    if mode == AgreementMode.SPAN_STRICT
                    else [(token, token + 1) for token in range(begin_token, end_token)]
                ),
                token_range=(begin_token, end_token),
            )
            for (
                anno_id,
                sdoc_id,
                user_id,
                code_id,
                begin,
                end,
                begin_token,
                end_token,
            ) in rows
        ]

    def _read_sentence_annotations(
        self,
        *,
        db: Session,
        sdoc_ids: list[int],
        code_ids: list[int],
        user_ids: list[int],
    ) -> list[_Annotation]:
        rows = db.execute(
            select(
                SentenceAnnotationORM.id,
                AnnotationDocumentORM.source_document_id,
                AnnotationDocumentORM.user_id,
                SentenceAnnotationORM.code_id,
                SentenceAnnotationORM.sentence_id_start,
                SentenceAnnotationORM.sentence_id_end,
            )
            .join(
                AnnotationDocumentORM,
                AnnotationDocumentORM.id
                == SentenceAnnotationORM.annotation_document_id,
            )
            .where(
                AnnotationDocumentORM.source_document_id.in_(sdoc_ids),
                AnnotationDocumentORM.user_id.in_(user_ids),
                SentenceAnnotationORM.code_id.in_(code_ids),
            )
        ).all()
        return [
            _Annotation(
                id=anno_id,
                sdoc_id=sdoc_id,
                user_id=user_id,
                code_id=code_id,
                units=[
                    (sentence, sentence)
                    for sentence in range(sentence_id_start, sentence_id_end + 1)
                ],
                token_range=None,
            )
            for (
                anno_id,
                sdoc_id,
                user_id,
                code_id,
                sentence_id_start,
                sentence_id_end,
            ) in rows
        ]

    def _read_sdoc_texts(
        self, *, db: Session, sdoc_ids: list[int]
    ) -> dict[int, _SdocText]:
        rows = db.execute(
            select(
                SourceDocumentDataORM.id,
                SourceDocumentDataORM.content,
                SourceDocumentDataORM.token_starts,
                SourceDocumentDataORM.token_ends,
                SourceDocumentDataORM.sentence_starts,
                SourceDocumentDataORM.sentence_ends,
            ).where(SourceDocumentDataORM.id.in_(sdoc_ids))
        ).all()
        return {
            sdoc_id: _SdocText(
                content=content,
                token_starts=token_starts,
                token_ends=token_ends,
                sentence_starts=sentence_starts,
                sentence_ends=sentence_ends,
            )
            for (
                sdoc_id,
                content,
                token_starts,
                token_ends,
                sentence_starts,
                sentence_ends,
            ) in rows
        }

    def _continues_segment(
        self,
        *,
        mode: AgreementMode,
        previous: _UnitCodes,
        previous_key: _UnitKey,
        unit: _UnitCodes,
        unit_key: _UnitKey,
    ) -> bool:
        if mode == AgreementMode.SPAN_STRICT:
            return False
        return (
            unit_key[0] == previous_key[0] + 1
            and unit.reference.keys() == previous.reference.keys()
            and unit.compared.keys() == previous.compared.keys()
        )

    def _to_segment(
        self,
        *,
        mode: AgreementMode,
        sdoc_id: int,
        text: _SdocText | None,
        group: list[_UnitKey],
        units: dict[_UnitKey, _UnitCodes],
        token_ranges: dict[tuple[int, _UnitKey], tuple[int, int]],
        code_order: dict[int, int],
    ) -> AgreementSegment:
        first, last = group[0], group[-1]
        content = text.content if text is not None else ""
        begin_token: int | None = None
        end_token: int | None = None
        sentence_id_start: int | None = None
        sentence_id_end: int | None = None
        match mode:
            case AgreementMode.SPAN_STRICT:
                begin, end = first
                begin_token, end_token = token_ranges[(sdoc_id, first)]
            case AgreementMode.SPAN_WORD:
                begin_token, end_token = first[0], last[1]
                begin = _at(text.token_starts if text else [], begin_token)
                end = _at(text.token_ends if text else [], end_token - 1)
            case AgreementMode.SENTENCE:
                sentence_id_start, sentence_id_end = first[0], last[0]
                begin = _at(text.sentence_starts if text else [], sentence_id_start)
                end = _at(text.sentence_ends if text else [], sentence_id_end)

        # every unit of the segment carries the same codes (see _continues_segment)
        first_unit = units[first]
        reference_codes = sorted(
            first_unit.reference.keys(), key=code_order.__getitem__
        )
        compared_codes = sorted(first_unit.compared.keys(), key=code_order.__getitem__)
        reference_annotation_ids: set[int] = set()
        compared_annotation_ids: set[int] = set()
        for unit_key in group:
            for annotation_ids in units[unit_key].reference.values():
                reference_annotation_ids.update(annotation_ids)
            for annotation_ids in units[unit_key].compared.values():
                compared_annotation_ids.update(annotation_ids)

        return AgreementSegment(
            sdoc_id=sdoc_id,
            begin=begin,
            end=end,
            begin_token=begin_token,
            end_token=end_token,
            sentence_id_start=sentence_id_start,
            sentence_id_end=sentence_id_end,
            num_units=len(group),
            text=content[begin:end],
            reference_code_ids=reference_codes,
            compared_code_ids=compared_codes,
            true_positive_code_ids=[c for c in reference_codes if c in compared_codes],
            false_negative_code_ids=[
                c for c in reference_codes if c not in compared_codes
            ],
            false_positive_code_ids=[
                c for c in compared_codes if c not in reference_codes
            ],
            reference_annotation_ids=sorted(reference_annotation_ids),
            compared_annotation_ids=sorted(compared_annotation_ids),
        )

    def _aggregate(
        self,
        *,
        params: AgreementParams,
        code_ids: list[int],
        segments: list[AgreementSegment],
    ) -> AgreementResult:
        # the last row / column is "no code"
        matrix_code_ids: list[int | None] = [*code_ids, None]
        matrix_index = {code_id: index for index, code_id in enumerate(matrix_code_ids)}
        matrix = [[0] * len(matrix_code_ids) for _ in matrix_code_ids]
        counts = {code_id: [0, 0, 0] for code_id in code_ids}

        for segment in segments:
            n = segment.num_units
            for code_id in segment.true_positive_code_ids:
                counts[code_id][0] += n
            for code_id in segment.false_positive_code_ids:
                counts[code_id][1] += n
            for code_id in segment.false_negative_code_ids:
                counts[code_id][2] += n

            rows: list[int | None] = [*segment.reference_code_ids] or [None]
            columns: list[int | None] = [*segment.compared_code_ids] or [None]
            for row in rows:
                for column in columns:
                    matrix[matrix_index[row]][matrix_index[column]] += n

        code_scores = [
            AgreementCodeScore(
                code_id=code_id, **_score(_Counts(*counts[code_id])).model_dump()
            )
            for code_id in code_ids
        ]
        total = _score(
            _Counts(
                tp=sum(c[0] for c in counts.values()),
                fp=sum(c[1] for c in counts.values()),
                fn=sum(c[2] for c in counts.values()),
            )
        )
        return AgreementResult(
            mode=params.mode,
            reference_user_id=params.reference_user_id,
            compared_user_id=params.compared_user_id,
            num_units=sum(segment.num_units for segment in segments),
            total=total,
            code_scores=code_scores,
            confusion_matrix_code_ids=matrix_code_ids,
            confusion_matrix=matrix,
            segments=segments,
        )


def _at(values: list[int], index: int) -> int:
    """The value at the index, or 0 if the document data does not reach it."""
    return values[index] if 0 <= index < len(values) else 0


def _score(counts: _Counts) -> AgreementScore:
    """Precision, recall and F1 from the raw counts; null where undefined."""
    tp, fp, fn = counts
    return AgreementScore(
        true_positives=tp,
        false_positives=fp,
        false_negatives=fn,
        precision=tp / (tp + fp) if tp + fp > 0 else None,
        recall=tp / (tp + fn) if tp + fn > 0 else None,
        f1=2 * tp / (2 * tp + fp + fn) if tp + fp + fn > 0 else None,
    )
