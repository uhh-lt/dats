from pydantic import BaseModel, Field

from modules.agreement.agreement_enum import AgreementMode


class AgreementParams(BaseModel):
    sdoc_ids: list[int] = Field(description="IDs of the SourceDocuments to compare")
    code_ids: list[int] = Field(
        description=(
            "IDs of the Codes to compare. Annotations with other codes are ignored. "
            "The order defines the order of the scores and the confusion matrix."
        )
    )
    reference_user_id: int = Field(
        description="ID of the reference annotator (gold standard)"
    )
    compared_user_id: int = Field(
        description="ID of the annotator compared with the reference"
    )
    mode: AgreementMode = Field(
        description="How the annotations are split into scoring units"
    )


class AgreementScore(BaseModel):
    true_positives: int = Field(
        description="Units that carry the code in the reference and in the comparison"
    )
    false_positives: int = Field(
        description="Units that carry the code in the comparison only"
    )
    false_negatives: int = Field(
        description="Units that carry the code in the reference only"
    )
    precision: float | None = Field(
        description="TP / (TP + FP), null if there are no positive predictions"
    )
    recall: float | None = Field(
        description="TP / (TP + FN), null if the reference has no positives"
    )
    f1: float | None = Field(
        description="2 TP / (2 TP + FP + FN), null if all counts are zero"
    )


class AgreementCodeScore(AgreementScore):
    code_id: int = Field(description="ID of the Code the scores refer to")


class AgreementSegment(BaseModel):
    """A stretch of consecutive units of one document with the same codes on both sides.

    In the strict span mode, every segment is exactly one span. In the word and
    sentence modes, neighboring words or sentences are merged as long as both
    annotators assign them the same codes.
    """

    sdoc_id: int = Field(description="ID of the SourceDocument of the segment")
    begin: int = Field(description="Begin of the segment in characters")
    end: int = Field(description="End of the segment in characters (exclusive)")
    begin_token: int | None = Field(
        description="Begin of the segment in tokens (span modes only)"
    )
    end_token: int | None = Field(
        description="End of the segment in tokens, exclusive (span modes only)"
    )
    sentence_id_start: int | None = Field(
        description="First sentence of the segment (sentence mode only)"
    )
    sentence_id_end: int | None = Field(
        description="Last sentence of the segment, inclusive (sentence mode only)"
    )
    num_units: int = Field(description="Number of units (words, spans, sentences)")
    text: str = Field(description="Text of the segment")
    reference_code_ids: list[int] = Field(
        description="Codes the reference annotator assigned to the segment"
    )
    compared_code_ids: list[int] = Field(
        description="Codes the compared annotator assigned to the segment"
    )
    true_positive_code_ids: list[int] = Field(description="Codes assigned by both")
    false_negative_code_ids: list[int] = Field(
        description="Codes assigned by the reference annotator only"
    )
    false_positive_code_ids: list[int] = Field(
        description="Codes assigned by the compared annotator only"
    )
    reference_annotation_ids: list[int] = Field(
        description="IDs of the reference annotator's annotations in the segment"
    )
    compared_annotation_ids: list[int] = Field(
        description="IDs of the compared annotator's annotations in the segment"
    )


class AgreementResult(BaseModel):
    mode: AgreementMode = Field(description="The scoring mode of the result")
    reference_user_id: int = Field(description="ID of the reference annotator")
    compared_user_id: int = Field(description="ID of the compared annotator")
    num_units: int = Field(
        description="Number of units that carry a code on at least one side"
    )
    total: AgreementScore = Field(
        description="Scores over all codes (micro average: the counts are summed)"
    )
    code_scores: list[AgreementCodeScore] = Field(
        description="Scores per code, in the order of the requested codes"
    )
    confusion_matrix_code_ids: list[int | None] = Field(
        description=(
            "Code IDs labeling the rows and columns of the confusion matrix. "
            "The last entry is null and stands for 'no code'."
        )
    )
    confusion_matrix: list[list[int]] = Field(
        description=(
            "Confusion matrix: cell [i][j] counts the units that carry code i in "
            "the reference and code j in the comparison. A unit with several codes "
            "is counted in every combination of them."
        )
    )
    segments: list[AgreementSegment] = Field(
        description=(
            "All segments, agreeing and disagreeing, sorted by document and position"
        )
    )
