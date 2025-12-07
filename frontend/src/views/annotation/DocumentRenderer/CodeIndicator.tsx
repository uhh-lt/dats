import CodeHooks from "../../../api/CodeHooks.ts";
import { contrastiveColors } from "../../../utils/colors.ts";

interface CodeIndicatorProps {
  codeId: number;
  annotationId: number;
  isSelected?: boolean;
  groups?: number[];
}

function CodeIndicator({ codeId, annotationId, isSelected, groups }: CodeIndicatorProps) {
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
        style={{
          backgroundColor: color,
          ...(isSelected && { boxShadow: "0 0 10px 5px " + color, borderRadius: "5px" }),
        }}
      >
        {text}
      </span>
    );
  }
  return (
    <span id={"span-annotation-" + annotationId} style={{ backgroundColor: "lightgray" }}>
      {" "}
      ...
    </span>
  );
}

export default CodeIndicator;
