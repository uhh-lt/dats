import { Box, BoxProps } from "@mui/material";
import { useMemo } from "react";
import parse, { HTMLReactParserOptions } from "html-react-parser";

interface DocumentPageProps {
  html: string;
  processingInstructions: HTMLReactParserOptions;
}

// needs data from useComputeTokenData
export function DocumentPage({ html, processingInstructions, ...props }: DocumentPageProps & BoxProps) {
  const renderedTokens = useMemo(() => {
    return parse(html, processingInstructions);
  }, [html, processingInstructions]);

  return <Box {...props}>{renderedTokens}</Box>;
}
