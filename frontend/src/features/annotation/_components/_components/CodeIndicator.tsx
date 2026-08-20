import { CodeHooks } from "@api/hooks/CodeHooks";
import { Icon, getIconComponent } from "@components/icons";
import { AttachedMemoMenu } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CircularProgress } from "@mui/material";
import { contrastiveColors } from "@utils/colors/colors";

interface CodeIndicatorProps {
  codeId: number;
  annotationId: number;
  groups?: number[];
  /** When > 0, a memo count is rendered inside the pill and opens the memo dialog on click. */
  memoCount?: number;
  /** The attached object type for the memo dialog. Defaults to SPAN_ANNOTATION. */
  attachedObjectType?: AttachedObjectType;
}

/**
 * Renders a stylish tag/badge indicator for a code annotation.
 * Displays the code name with a colored pill design for better visual recognition.
 * @param codeId - The ID of the code to display
 * @param annotationId - The ID of the annotation this indicator belongs to
 * @param groups - Optional group IDs for coreference annotations
 * @param memoCount - Number of memos attached to this annotation (renders a memo section in the pill)
 */
export function CodeIndicator({
  codeId,
  annotationId,
  groups,
  memoCount = 0,
  attachedObjectType = AttachedObjectType.SPAN_ANNOTATION,
}: CodeIndicatorProps) {
  const code = CodeHooks.useGetCode(codeId);

  // pending (not yet persisted) annotations have negative ids. They render their real code pill
  // (so the label never flickers), but are styled as pending and made non-interactive until saved.
  const isPending = annotationId < 0;

  if (code.data) {
    let text: string;
    let color: string;
    if (code.data.is_system && code.data.name === "MENTION" && groups && groups.length === 1) {
      // coreference annotation
      text = groups[0].toString();
      color = contrastiveColors[groups[0] % contrastiveColors.length];
    } else {
      text = code.data.name + (groups && groups.length ? ": " + groups.join(",") : "");
      color = code.data.color;
    }

    return (
      <span
        className={`code-indicator ${isPending ? "code-indicator--pending" : ""}`}
        title={isPending ? "Saving annotation…" : undefined}
        style={
          {
            "--indicator-color": color,
          } as React.CSSProperties
        }
      >
        <span className="code-indicator__color-dot" />
        <span className="code-indicator__text">{text}</span>
        {memoCount > 0 && !isPending && (
          <AttachedMemoMenu
            attachedObjectType={attachedObjectType}
            attachedObjectId={annotationId}
            renderTrigger={(handleClick, isFetching) => (
              <span
                className="code-indicator__memo"
                onClick={isFetching ? undefined : handleClick}
                title="Show attached memos"
              >
                {isFetching ? (
                  <CircularProgress size={12} />
                ) : (
                  <>
                    {getIconComponent(Icon.MEMO_ALT, { style: { fontSize: "inherit" } })}
                    <span className="code-indicator__memo-count">{memoCount}</span>
                  </>
                )}
              </span>
            )}
          />
        )}
      </span>
    );
  }
  return (
    <span className="code-indicator code-indicator--loading">
      <span className="code-indicator__text">...</span>
    </span>
  );
}
