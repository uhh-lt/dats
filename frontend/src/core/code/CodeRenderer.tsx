import { CodeHooks } from "@api/hooks/CodeHooks";
import { ExpandableRenderer, ExpandableRendererProps } from "@components/ExpandableRenderer";
import { Icon, getIconComponent } from "@components/icons";
import { MemoIndicator } from "@core/memo";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { CodeRead } from "@models/CodeRead";
import { Stack, Typography } from "@mui/material";
import { memo } from "react";

export interface CodeRendererSharedProps extends ExpandableRendererProps {
  renderMemoIndicator?: boolean;
}

interface CodeRendererProps extends CodeRendererSharedProps {
  code: number | CodeRead;
}

export const CodeRenderer = memo(({ code, ...props }: CodeRendererProps) => {
  if (typeof code === "number") {
    return <CodeRendererWithoutData codeId={code} {...props} />;
  } else {
    return <CodeRendererWithData code={code} {...props} />;
  }
});

const CodeRendererWithoutData = memo(({ codeId, ...props }: { codeId: number } & CodeRendererSharedProps) => {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return <CodeRendererWithData code={code.data} {...props} />;
  } else if (code.isError) {
    return <div>{code.error.message}</div>;
  } else {
    return <div>Loading...</div>;
  }
});

const CodeRendererWithData = memo(
  ({ code, renderMemoIndicator, ...expandProps }: { code: CodeRead } & CodeRendererSharedProps) => {
    return (
      <ExpandableRenderer {...expandProps} expandedContent={<CodeContext code={code} />}>
        <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%" overflow="hidden">
          {getIconComponent(Icon.CODE, { style: { color: code.color, flexShrink: 0 } })}
          <Typography component="span" noWrap minWidth={0}>
            {code.name}
          </Typography>
          {renderMemoIndicator && code.memo_ids && code.memo_ids.length > 0 && (
            <MemoIndicator
              memoIds={code.memo_ids}
              attachedObjectType={AttachedObjectType.CODE}
              attachedObjectId={code.id}
            />
          )}
        </Stack>
      </ExpandableRenderer>
    );
  },
);

function CodeContext({ code }: { code: CodeRead }) {
  return (
    <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {code.description || "No description available."}
    </Typography>
  );
}
