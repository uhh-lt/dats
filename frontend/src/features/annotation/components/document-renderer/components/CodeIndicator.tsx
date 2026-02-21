import { CodeHooks } from "../../../../../api/CodeHooks.ts";
import { contrastiveColors } from "../../../../../utils/colors.ts";

interface CodeIndicatorProps {
  codeId: number;
  annotationId: number;
  isSelected?: boolean;
  groups?: number[];
}

/**
 * Renders a stylish tag/badge indicator for a code annotation.
 * Displays the code name with a colored pill design for better visual recognition.
 * @param codeId - The ID of the code to display
 * @param annotationId - The ID of the annotation this indicator belongs to
 * @param isSelected - Whether this annotation is currently selected
 * @param groups - Optional group IDs for coreference annotations
 */
export function CodeIndicator({ codeId, annotationId, isSelected, groups }: CodeIndicatorProps) {
  const code = CodeHooks.useGetCode(codeId);

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
      </span>
    );
  }
  return (
    <span id={"span-annotation-" + annotationId} className="code-indicator code-indicator--loading">
      <span className="code-indicator__text">...</span>
    </span>
  );
}
