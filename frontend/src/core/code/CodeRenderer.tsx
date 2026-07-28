import { CodeHooks } from "@api/hooks/CodeHooks";
import { Icon, getIconComponent } from "@components/icons";
import { CodeRead } from "@models/CodeRead";
import { Chip, Stack } from "@mui/material";
import { memo } from "react";
import { CodeOriginBranchBadge } from "./CodeOriginBranchBadge";

interface CodeRendererProps {
  code: number | CodeRead;
  showOriginBranch?: boolean;
}

const CodeRendererWithData = memo(({ code, showOriginBranch }: { code: CodeRead; showOriginBranch?: boolean }) => {
  return (
    <Stack direction="row" alignItems="center">
      {getIconComponent(Icon.CODE, { style: { color: code.color } })}
      {code.name}
      {!code.is_active && <Chip size="small" variant="outlined" label="Historical" sx={{ ml: 0.5 }} />}
      {showOriginBranch && <CodeOriginBranchBadge code={code} />}
    </Stack>
  );
});

const CodeRendererWithoutData = memo(({ codeId, showOriginBranch }: { codeId: number; showOriginBranch?: boolean }) => {
  const code = CodeHooks.useGetCode(codeId);

  if (code.data) {
    return <CodeRendererWithData code={code.data} showOriginBranch={showOriginBranch} />;
  } else if (code.isError) {
    return <div>{code.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

export const CodeRenderer = memo(({ code, showOriginBranch }: CodeRendererProps) => {
  if (typeof code === "number") {
    return <CodeRendererWithoutData codeId={code} showOriginBranch={showOriginBranch} />;
  } else {
    return <CodeRendererWithData code={code} showOriginBranch={showOriginBranch} />;
  }
});
