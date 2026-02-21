import { Stack } from "@mui/material";
import { memo } from "react";
import { CodeHooks } from "../../../api/CodeHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";

interface CodeRendererProps {
  code: number | CodeRead;
}

const CodeRendererWithData = memo(({ code }: { code: CodeRead }) => {
  return (
    <Stack direction="row" alignItems="center">
      {getIconComponent(Icon.CODE, { style: { color: code.color } })}
      {code.name}
    </Stack>
  );
});

const CodeRendererWithoutData = memo(({ codeId }: { codeId: number }) => {
  const code = CodeHooks.useGetCode(codeId);

  if (code.data) {
    return <CodeRendererWithData code={code.data} />;
  } else if (code.isError) {
    return <div>{code.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

export const CodeRenderer = memo(({ code }: CodeRendererProps) => {
  if (typeof code === "number") {
    return <CodeRendererWithoutData codeId={code} />;
  } else {
    return <CodeRendererWithData code={code} />;
  }
});
