# Annotator Agreement

The **Annotator Agreement** analysis compares the annotations of two annotators on the same documents. It tells you how well they agree, which codes they confuse, and lists every disagreement so you can resolve it. It works for any pair of annotators: two humans (inter-annotator agreement, deriving a group standard), or an automatic annotator against a gold standard.

## 1\. Configuring the Analysis (Left Panel)

1. **Reference annotator:** the gold standard. Its annotations are taken as correct.
2. **Compared annotator:** the annotator that is evaluated against the reference. The swap button exchanges the two.
3. **Scoring mode:** how annotations are split into units that are compared:
   - **Spans, word level:** every word counts and is correct if it carries the right code, wherever the spans begin or end.
   - **Spans, strict:** a span is correct only if its code and its exact begin and end match.
   - **Sentences:** every sentence counts and is correct if it carries the right sentence annotation code.
4. **Documents with tag(s):** all documents that carry at least one of the selected tags are compared. To compare a search result or a folder, tag its documents first.
5. **Codes:** only annotations with these codes are compared. Selecting a parent code does not select its children.
6. **Hide codes without annotations** (optional): hides the codes that neither annotator used from the scores and the confusion matrix. Nothing is hidden unless you switch this on.

Nothing is excluded automatically: every annotation of the two annotators with a selected code counts, including annotations accepted from another annotator.

## 2\. Scores and Confusion Matrix

**Every code is scored separately per unit.** A word that carries code A in the reference and codes A and B in the comparison is a true positive (TP) for A and a false positive (FP) for B.

- **Scores:** TP, FP and false negatives (FN) per code, with precision, recall and F1. The total sums the counts of all codes (micro average). A score shows "–" when it is undefined (e.g. recall of a code the reference never uses).
- **Confusion matrix:** rows are the reference codes, columns the compared codes. A cell (X, Y) counts the units that carry X in the reference and Y in the comparison. The **No code** row and column count over-predicted units (FP) and missed units (FN). A unit with several codes is counted in every combination of its codes.
- **Export:** the download button in the settings exports the raw counts (TP, FP, FN) per document and code as CSV. Use them to compute other measures.

## 3\. Mismatch Finder (Right Panel)

The right panel lists the **segments**: stretches of consecutive words (or sentences) that carry the same codes on both sides. Each segment shows its text, the codes of both annotators, what was missed or added, and the annotation IDs of both sides. Click an ID to copy it.

- **Click a cell** of the confusion matrix to list exactly the segments behind it.
- **Filter** by error type (missed, extra, confused codes, agreements), by code and by document.
- **Export** the listed segments with their annotation IDs as CSV.
- **Click a segment** to open the document in the comparison view, scrolled to the segment and highlighted on both sides.

## 4\. Mismatch Navigation in the Comparison View

When two annotators are compared in the annotation view (_Compare with ..._), a **Mismatches** bar appears above the comparison. Choose a scoring mode, a code and an error type, and jump to the next or previous mismatch with the arrow buttons. The focused mismatch is outlined on both sides.

- Opened from the mismatch finder, the navigation covers all documents of the analysis: after the last mismatch of a document, _next_ opens the next document with a matching mismatch.
- Opened on its own, e.g. while resolving disagreements between two annotators document by document, it covers the current document.

!!! tip "Annotation IDs"

    Annotation IDs are shown in the annotation explorer and in the annotation menu, and are copied with a click. Use them to reference annotations in external logs or via the API.
