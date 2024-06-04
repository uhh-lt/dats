import CodeHooks from "../../../api/CodeHooks.ts";

interface MarkProps {
  codeId: number;
  isStart: boolean;
  isEnd: boolean;
  height: string;
  top: string;
}

function Mark({ codeId, isStart, isEnd, height, top }: MarkProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return (
      <div
        className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
        style={{ backgroundColor: code.data.color, height: height, top: top }}
      />
    );
  }
  return (
    <div
      className={"mark" + (isStart ? " start" : "") + (isEnd ? " end" : "")}
      style={{ backgroundColor: "lightgrey", height: height, top: top }}
    />
  );
}

export default Mark;
