import { AgreementResult } from "@models/AgreementResult";

/**
 * The result without the codes that neither annotator used (TP = FP = FN = 0):
 * their scores, confusion matrix rows and columns. "No code" is always kept.
 * Only applied when the user opts in; the counts of all other codes are unchanged.
 */
export function withoutUnusedCodes(result: AgreementResult): AgreementResult {
  const used = new Set(
    result.code_scores
      .filter((score) => score.true_positives + score.false_positives + score.false_negatives > 0)
      .map((score) => score.code_id),
  );
  const keep = result.confusion_matrix_code_ids
    .map((codeId, index) => ({ codeId, index }))
    .filter(({ codeId }) => codeId === null || used.has(codeId))
    .map(({ index }) => index);
  return {
    ...result,
    code_scores: result.code_scores.filter((score) => used.has(score.code_id)),
    confusion_matrix_code_ids: keep.map((index) => result.confusion_matrix_code_ids[index]),
    confusion_matrix: keep.map((row) => keep.map((column) => result.confusion_matrix[row][column])),
  };
}
