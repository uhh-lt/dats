import { CodeHooks } from "@api/hooks/CodeHooks";
import { Icon, getIconComponent } from "@components/icons";
import { useOpenMemoDialog } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { contrastiveColors } from "@utils/colors/colors";

interface CodeIndicatorProps {
  codeId: number;
  annotationId: number;
  isSelected?: boolean;
  groups?: number[];
  /** When > 0, a memo count is rendered inside the pill and opens the memo dialog on click. */
  memoCount?: number;
}

/**
 * Renders a stylish tag/badge indicator for a code annotation.
 * Displays the code name with a colored pill design for better visual recognition.
 * @param codeId - The ID of the code to display
 * @param annotationId - The ID of the annotation this indicator belongs to
 * @param isSelected - Whether this annotation is currently selected
 * @param groups - Optional group IDs for coreference annotations
 * @param memoCount - Number of memos attached to this annotation (renders a memo section in the pill)
 */
export function CodeIndicator({ codeId, annotationId, isSelected, groups, memoCount = 0 }: CodeIndicatorProps) {
  const code = CodeHooks.useGetCode(codeId);
  const openMemoDialog = useOpenMemoDialog();

  const handleMemoClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    openMemoDialog({
      attachedObjectType: AttachedObjectType.SPAN_ANNOTATION,
      attachedObjectId: annotationId,
    });
  };

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
        id={"span-annotation-" + annotationId}
        className={`code-indicator ${isSelected ? "code-indicator--selected" : ""}`}
        style={
          {
            "--indicator-color": color,
          } as React.CSSProperties
        }
      >
        <span className="code-indicator__color-dot" />
        <span className="code-indicator__text">{text}</span>
        {memoCount > 0 && (
          <span className="code-indicator__memo" onClick={handleMemoClick} title="Has memo — click to open">
            {getIconComponent(Icon.MEMO_ALT, { style: { fontSize: "inherit" } })}
            <span className="code-indicator__memo-count">{memoCount}</span>
          </span>
        )}
      </span>
    );
  }
  return (
    <span id={"span-annotation-" + annotationId} className="code-indicator code-indicator--loading">
      <span className="code-indicator__text">...</span>
    </span>
  );
}
