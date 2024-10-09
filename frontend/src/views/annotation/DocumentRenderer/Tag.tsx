import CodeHooks from "../../../api/CodeHooks.ts";

interface TagProps {
  codeId: number;
  annotationId: number;
  isSelected?: boolean;
}

function Tag({ codeId, annotationId, isSelected }: TagProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return (
      <span
        id={"span-annotation-" + annotationId}
        style={{
          backgroundColor: code.data.color,
          ...(isSelected && {
            boxShadow: "0 0 10px 5px " + code.data.color,
            borderRadius: "5px",
          }),
        }}
      >
        {" "}
        {code.data.name}
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

export default Tag;
