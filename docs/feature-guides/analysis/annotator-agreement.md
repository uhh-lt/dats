# Annotator Agreement

The **Annotator Agreement** analysis compares the annotations of two annotators on the same documents. It tells you how well they agree, which codes they confuse, and lists every disagreement so you can resolve it. It works for any pair of annotators: two humans (inter-annotator agreement, deriving a group standard), or an automatic annotator against a gold standard.

## 1\. Configuring the Analysis (Left Panel)

1. **Reference annotator:** the gold standard. Its annotations are taken as correct.
2. **Compared annotator:** the annotator that is evaluated against the reference. The swap button exchanges the two.
3. **Annotation type:** span annotations (words and phrases) or sentence annotations (one or more whole sentences).
4. **Scoring:** how the annotations are split into units that are compared:
   - **Per word / per sentence:** every word (span annotations) or sentence (sentence annotations) counts on its own and is correct if it carries the same code on both sides, wherever the annotations begin or end. 3 annotated words against 2 of them: 2 of 3 are correct.
   - **Exact boundaries:** every annotation counts as a whole and is correct only if the other annotator assigned the same code from exactly the same first to the same last word or sentence. 3 annotated words against 2 of them are a miss and an extra.
5. **Documents with tag(s):** all documents that carry at least one of the selected tags are compared. To compare a search result or a folder, tag its documents first.
6. **Codes:** only annotations with these codes are compared. Type to search the codes; selecting a parent code does not select its children.
7. **Hide codes without annotations** (optional): hides the codes that neither annotator used from the scores and the confusion matrix. Nothing is hidden unless you switch this on.

Nothing is excluded automatically: every annotation of the two annotators with a selected code counts, including annotations accepted from another annotator.

## 2\. Scores and Confusion Matrix

**Every code is scored separately per unit.** A word that carries code A in the reference and codes A and B in the comparison is a true positive (TP) for A and a false positive (FP) for B.

- **Scores:** TP, FP and false negatives (FN) per code, with precision, recall and F1. The total sums the counts of all codes (micro average). A score shows "–" when it is undefined (e.g. recall of a code the reference never uses).
- **Confusion matrix:** rows are the reference codes, columns the compared codes. A cell (X, Y) counts the units that carry X in the reference and Y in the comparison. The **No code** row and column count over-predicted units (FP) and missed units (FN). A unit with several codes is counted in every combination of its codes.
- **Export:** the download button in the settings exports the raw counts (TP, FP, FN) per document and code as CSV. Use them to compute other measures.

## 3\. Mismatch Finder (Right Panel)

The right panel lists the **segments**: stretches of consecutive words (or sentences) that carry the same codes on both sides; with exact boundaries, every annotation is a segment. Each segment is shown in its context, rendered like the span or sentence comparison of the annotator: the reference annotator on the left, the compared annotator on the right. Only the annotations of the segment are shown, so every row focuses on one mismatch. The context is:

- **Span annotations:** the paragraph of the segment (or the sentence before and after it, if the document has no paragraphs or the paragraph is very long).
- **Sentence annotations:** the annotated sentences plus one sentence before and after them.

Above the text, the badges tell what the compared annotator missed or added, followed by the annotation IDs of both sides. Click an ID to copy it.

- **Click a cell** of the confusion matrix to list exactly the segments behind it.
- **Filter** by error type (every type explains itself in the dropdown), by code and by document.
- **Export** the listed segments with their annotation IDs as CSV.
- **Open in annotator** opens the document with both annotators side by side (the span or sentence comparison), at the segment. Edit the annotations there.

The list is read-only and stays as it is while you edit annotations elsewhere. When annotations changed, a message offers to **recompute** the agreement.

!!! tip "Annotation IDs"

    Annotation IDs are shown in the annotation explorer and in the annotation menu, and are copied with a click. Use them to reference annotations in external logs or via the API.
