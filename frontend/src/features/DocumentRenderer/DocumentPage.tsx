import { Box, BoxProps } from "@mui/material";
import { useMemo } from "react";
// @ts-ignore
import { Parser } from "html-to-react";

const htmlToReactParser = new Parser();

const isValidNode = function () {
  return true;
};

interface DocumentPageProps {
  html: string;
  processingInstructions: any;
}

// needs data from useComputeTokenData
function DocumentPage({ html, processingInstructions, ...props }: DocumentPageProps & BoxProps) {
  const renderedTokens = useMemo(() => {
    return htmlToReactParser.parseWithInstructions(html, isValidNode, processingInstructions);
  }, [html, processingInstructions]);

  return <Box {...props}>{renderedTokens}</Box>;
}

export default DocumentPage;
