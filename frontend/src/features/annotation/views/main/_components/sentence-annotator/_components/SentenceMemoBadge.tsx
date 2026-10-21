import { Icon, getIconComponent } from "@components/icons";
import { MemoCreateOrSelectMenu } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { SentenceAnnotationRead } from "@models/SentenceAnnotationRead";
import { CircularProgress } from "@mui/material";

/**
 * A small memo badge rendered at the top of a sentence annotation bar.
 * Uses the same pill styling as code indicators, in the annotation's code color.
 */
export function SentenceMemoBadge({ annotation, color }: { annotation: SentenceAnnotationRead; color: string }) {
  return (
    <MemoCreateOrSelectMenu
      attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
      attachedObjectId={annotation.id}
      renderTrigger={(handleClick, isFetching) => (
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
          onClick={isFetching ? undefined : handleClick}
          title="Show attached memos"
        >
          <span className="code-indicator__text memo-badge__content">
            {isFetching ? (
              <CircularProgress size={12} />
            ) : (
              <>
                {getIconComponent(Icon.MEMO_ALT, { style: { fontSize: "inherit" } })}
                <span className="memo-badge__count">{annotation.memo_ids.length}</span>
              </>
            )}
          </span>
        </span>
      )}
    />
  );
}
