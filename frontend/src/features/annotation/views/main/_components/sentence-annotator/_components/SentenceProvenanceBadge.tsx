import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { ProvenanceIndicator } from "../../_components/ProvenanceIndicator";

/**
 * The provenance badge at the top of a sentence annotation bar, below the memo badge if there is one.
 */
export function SentenceProvenanceBadge({ annotation }: { annotation: SentenceAnnotationRead }) {
  return (
    <span
      style={{
        position: "absolute",
        top: annotation.memo_ids.length > 0 ? "24px" : "6px",
        right: "2px",
        fontSize: "0.75rem",
        lineHeight: 1,
      }}
    >
      <ProvenanceIndicator annotation={annotation} />
    </span>
  );
}
