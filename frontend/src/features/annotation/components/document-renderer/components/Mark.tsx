import { CodeHooks } from "../../../../../api/CodeHooks.ts";
import { contrastiveColors } from "../../../../../utils/colors.ts";

interface MarkProps {
  codeId: number;
  isStart: boolean;
  isEnd: boolean;
  height: string;
  top: string;
  groups?: number[];
}

export function Mark({ codeId, isStart, isEnd, height, top, groups }: MarkProps) {
  const code = CodeHooks.useGetCode(codeId);

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
        style={{ backgroundColor: color, height: height, top: top }}
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
