import { CodeHooks } from "@api/hooks/CodeHooks";
import { ContextualAnnotation } from "@api/hooks/useAnnotationBranchVisibility";
import { SpanAnnotationRead } from "@models/SpanAnnotationRead";
import { contrastiveColors } from "@utils/colors/colors";

interface MarkProps {
  annotation: ContextualAnnotation<SpanAnnotationRead>;
  isStart: boolean;
  isEnd: boolean;
  height: string;
  top: string;
  groups?: number[];
}

export function Mark({ annotation, isStart, isEnd, height, top, groups }: MarkProps) {
  const code = CodeHooks.useGetCode(annotation.code_id);

  if (code.data) {
    let color: string;
    if (code.data.is_system && code.data.name === "MENTION" && groups && groups.length === 1) {
      // coreference annotation
      color = contrastiveColors[groups[0] % contrastiveColors.length];
    } else {
      color = code.data.color;
    }
    return (
      <span
        className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
        style={{
          backgroundColor: color,
          height: height,
          top: top,
          outline: annotation.requires_review ? "2px dashed #ed6c02" : undefined,
        }}
        title={annotation.requires_review ? "This annotation needs review" : undefined}
      />
    );
  }
  return (
    <span
      className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
      style={{ backgroundColor: "lightgrey", height: height, top: top }}
    />
  );
}
