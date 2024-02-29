import { Stack, Box } from "@mui/material";
import CodeHooks from "../../../../api/CodeHooks.ts";

interface CodeBlockProps {
  codeId: number;
}

function CodeBlock({ codeId }: CodeBlockProps) {
  const code = CodeHooks.useGetCode(codeId);

  if (code.isSuccess) {
    return (
      <Stack direction="row" alignItems="baseline" component="span" display="inline-flex">
        <Box
          sx={{ width: 16, height: 16, backgroundColor: code.data.color, mr: 1, flexShrink: 0, alignSelf: "center" }}
          component="span"
        />
        {code.data.name}
      </Stack>
    );
  } else {
    return <span>Loading...</span>;
  }
}

export default CodeBlock;
