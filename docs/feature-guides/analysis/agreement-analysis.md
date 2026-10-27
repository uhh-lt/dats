# Annotator Agreement

When several people annotate the same corpus, you eventually want to know how much they actually agree: Did they code the same passages? Did they assign the same codes? The **Annotator Agreement** tool answers these questions by comparing a _reference annotator_ (e.g., your gold standard) with a _compared annotator_ across a set of documents.

It computes precision, recall and F1 per code, visualizes confusions in a matrix, and lists every single disagreement so you can trace the numbers back to the actual annotations.

## 1. Configuring the Comparison (Left Panel)

Open the tool from the Analysis Dashboard and configure the comparison in the settings panel on the left:

1. **Reference & Compared Annotator:** Choose the two annotators you want to compare. The reference annotator acts as the "gold standard" against which the compared annotator is measured. Use the swap button between the two selectors to switch sides.
2. **Scoring Mode:** Decide what counts as a match:
   - **Spans, word level:** Every word counts and is correct if it carries the right code, wherever the spans begin or end.
   - **Spans, strict:** A span is correct only if its code _and_ its exact begin and end match.
   - **Sentences:** Every sentence counts and is correct if it carries the right code.
3. **Documents with tag(s):** Select one or more tags. All documents carrying at least one of the tags are compared; the caption below the selector shows how many documents that is.
4. **Codes:** Select the codes to compare from a hierarchical list (with a "Select all codes" button). Note that selecting a parent code does not select its children.
5. **Hide codes without annotations:** An opt-in switch that hides codes neither annotator used from the scores and the confusion matrix. It is off by default; when codes are hidden, their number is shown above the scores table.

!!! tip "Shareable Configurations"

    The entire configuration (annotators, mode, tags, codes, and filters) is stored in the URL. Simply copy the address bar to share the exact same comparison with your team.

The **export icon** in the settings card downloads the raw counts (true positives, false positives, false negatives) per document and code as a CSV file.

## 2. Reading the Scores (Center)

Once annotators, tags, and codes are selected, the **Scores** table appears. It shows, per code and as a micro-averaged total:

- **TP / FP / FN:** How many units (words, spans, or sentences, depending on the scoring mode) were true positives, false positives, or false negatives. Every code is scored separately per unit.
- **Precision, Recall, F1:** The resulting scores in percent. A dash ("–") is shown when a score is undefined, e.g., recall when the reference annotator did not use a code at all.

The table scrolls horizontally; the code column stays visible while scrolling.

## 3. The Confusion Matrix (Center)

Below the scores, the **Confusion Matrix** shows the reference annotator's codes (rows) against the compared annotator's codes (columns), including a "No code" row and column for units that only one side annotated.

- Cells on the diagonal (green) are agreements; off-diagonal cells (red) are confusions. The darker a cell, the more units it contains.
- A unit with several codes is counted in every combination of them.
- **Click a cell** to select it: the segment list on the right is filtered to exactly the segments behind that number. Remove the chip above the list to clear the selection again.

## 4. Finding Mismatches (Right Panel)

The **Segments** panel is your mismatch finder. It lists the compared segments grouped by document and lets you filter them:

- **Error type:** All disagreements (default), Missed (false negatives — codes only the reference assigned), Extra (false positives — codes only the compared annotator assigned), Confused codes (both sides coded the segment differently), Agreements, or All segments.
- **Code** and **Document:** Narrow the list further to one code or one document.
- **Matrix cell:** A selected confusion matrix cell acts as an additional filter.

Each entry shows a text preview, the codes of both sides, "missed"/"extra" chips for the differences, and the **annotation IDs** of both sides — click an ID to copy it, e.g., to reference the annotation in a memo or the logbook.

- **CSV Export:** The export icon downloads the currently listed segments as a CSV file (scoring mode, annotators, document name, codes, and annotation IDs).
- **Jump to Context:** Click an entry to open the document in the Annotation View's [Compare View](../annotation-view.md#the-compare-view), showing both annotators side by side at exactly that segment.

The empty states tell you why there is nothing to see: neither annotator used the selected codes in these documents, the annotators agree on everything, or your filters exclude all segments.
