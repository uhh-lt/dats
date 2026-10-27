# Annotator Agreement

When several people annotate the same corpus, sooner or later you will want to know how much they actually agree. The **Annotator Agreement** tool measures this inter-annotator agreement: it compares a reference annotator (your gold standard) with another annotator and reports per-code scores, a confusion matrix, and the exact segments where the two disagree.

Use it to evaluate annotation quality, to align your team's coding scheme after a pilot round, or to validate automatically generated annotations against a trusted reference.

## 1\. Configuring the Comparison (Left Panel)

Open the tool from the Analysis Dashboard by clicking the **Annotator Agreement** card. The settings panel on the left asks you for five things:

1. **Reference annotator:** The annotator whose coding is treated as the gold standard.
2. **Compared annotator:** The annotator you want to evaluate. Use the swap button (⇄) between the two selectors to exchange the roles.
3. **Scoring mode:** How the annotations are compared:
   - _Spans, word level:_ Every word counts and is correct if it carries the right code, wherever the spans begin or end.
   - _Spans, strict:_ A span is correct only if its code and its exact begin and end match.
   - _Sentences:_ Every sentence counts and is correct if it carries the right code.
4. **Documents with tag(s):** Select one or more tags. All documents that carry at least one of the tags are compared; the caption below the selector tells you how many documents were found.
5. **Codes:** The codes to compare. The hierarchical selector lets you pick whole subtrees or use "select all".

An opt-in switch, **Hide codes without annotations**, removes the codes that neither annotator used from the scores and the confusion matrix. It is off by default; when it hides codes, the Scores table shows how many.

All settings live in the URL, so you can bookmark or share a link to reproduce the exact same comparison.

!!! tip "Exporting raw counts"

    The download icon in the settings card header exports the raw counts (TP, FP, FN) per document and code as a CSV file — the basis for computing further agreement coefficients yourself.

## 2\. Reading the Scores

Once annotators, documents, and codes are selected, the **Scores** table appears. For every code — and in the **Total (micro)** row — it shows:

- **TP** (true positives): Units where both annotators assigned the code.
- **FP** (false positives, "extra"): Units where the compared annotator assigned the code but the reference did not.
- **FN** (false negatives, "missed"): Units where the reference assigned the code but the compared annotator did not.
- **Precision, Recall, F1:** The standard scores computed from these counts. A dash (–) appears when a value is undefined, e.g. the precision of a code the compared annotator never assigned.

The table scrolls horizontally; the code column stays visible while scrolling.

## 3\. The Confusion Matrix

The **confusion matrix** shows where the codes get confused. Rows are the reference annotator's codes, columns the compared annotator's codes, and both include a **No code** row/column for units that only one side coded. A unit carrying several codes is counted in every combination of them.

- Cells on the diagonal (green) are agreements; off-diagonal cells (red) are confusions. The darker a cell, the more units it contains.
- **Click a cell** to list exactly the segments behind it in the right panel.

## 4\. Finding Mismatches (Right Panel)

The **Segments** panel on the right is the mismatch finder: it lists every compared segment, grouped by document. Above the list you can filter the segments:

- **Matrix cell:** The cell you clicked in the confusion matrix appears as a removable chip.
- **Error type:** All disagreements (the default), Missed (false negatives), Extra (false positives), Confused codes, Agreements, or All segments.
- **Code** and **Document:** Narrow the list to one code or one document.

Each entry shows a preview of the annotated text, the codes of both sides, chips marking the errors (_missed_ / _extra_, or _agreement_), and the annotation IDs of both sides. **Click an annotation ID chip to copy the ID** — handy for referencing the annotation in your logbook or via the API.

- **CSV export:** The download icon at the top of the panel exports the currently listed segments as CSV, including the scoring mode, both annotators, the document name, the codes, and the annotation IDs.
- **Jump to context:** Clicking an entry opens the document in the Annotation View's compare mode, showing both annotators side by side at exactly that segment.

The empty states tell the situations apart: neither annotator used the selected codes in these documents, the annotators fully agree, or your filters exclude everything.
