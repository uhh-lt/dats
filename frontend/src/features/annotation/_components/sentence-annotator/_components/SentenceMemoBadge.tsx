import { Icon, getIconComponent } from "@components/icons";
import { useOpenMemoDialog } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";

/**
 * A small memo badge rendered at the top of a sentence annotation bar.
 * Uses the same pill styling as code indicators, in the annotation's code color.
 */
export function SentenceMemoBadge({ annotation, color }: { annotation: SentenceAnnotationRead; color: string }) {
  const openMemoDialog = useOpenMemoDialog();

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    openMemoDialog({
      attachedObjectType: AttachedObjectType.SENTENCE_ANNOTATION,
      attachedObjectId: annotation.id,
    });
  };

  return (
    <span
      className="code-indicator memo-badge"
      style={
        {
          "--indicator-color": color,
          position: "absolute",
          top: "6px",
          right: "0px",
          marginLeft: 0,
          fontSize: "0.65rem",
          padding: "1px 3px",
          borderRadius: "4px 0 0 4px",
          borderRight: "none",
        } as React.CSSProperties
      }
      onClick={handleClick}
      title="Has memo — click to open"
    >
      <span className="code-indicator__text memo-badge__content">
        {getIconComponent(Icon.MEMO_ALT, { style: { fontSize: "inherit" } })}
        <span className="memo-badge__count">{annotation.memo_ids.length}</span>
      </span>
    </span>
  );
}
