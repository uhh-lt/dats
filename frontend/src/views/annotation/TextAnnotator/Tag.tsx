import React from "react";
import CodeHooks from "../../../api/CodeHooks";

interface TagProps {
  codeId: number;
}

function Tag({ codeId }: TagProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return <span style={{ backgroundColor: code.data?.color || undefined }}> {code.data?.name || undefined}</span>;
  }
  return null;
}

export default Tag;
