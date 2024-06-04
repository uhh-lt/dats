import CodeHooks from "../../../api/CodeHooks.ts";

interface TagProps {
  codeId: number;
}

function Tag({ codeId }: TagProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return <span style={{ backgroundColor: code.data.color }}> {code.data.name}</span>;
  }
  return <span style={{ backgroundColor: "lightgray" }}> ...</span>;
}

export default Tag;
