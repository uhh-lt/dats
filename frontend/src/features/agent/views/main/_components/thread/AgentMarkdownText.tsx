import "@assistant-ui/react-markdown/styles/dot.css";

import { type CodeHeaderProps, MarkdownTextPrimitive, memoizeMarkdownComponents } from "@assistant-ui/react-markdown";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Stack, styled, Typography } from "@mui/material";
import { memo, useState } from "react";
import { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { DATS_LINK_SCHEME, parseDatsLink } from "../../_utils/datsLinkUtils";
import { AgentEntityChip } from "./AgentEntityChip";
import { AgentIconButton } from "./AgentIconButton";

function CodeHeader({ language, code }: CodeHeaderProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!code || isCopied) return;
    void navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ mt: 1.5, px: 1.5, py: 0.25, bgcolor: "grey.200", borderRadius: "8px 8px 0 0" }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "lowercase" }}>
        {language}
      </Typography>
      <AgentIconButton tooltip={isCopied ? "Copied" : "Copy code"} onClick={handleCopy}>
        {isCopied ? <CheckIcon fontSize="inherit" /> : <ContentCopyIcon fontSize="inherit" />}
      </AgentIconButton>
    </Stack>
  );
}

const markdownComponents = memoizeMarkdownComponents({
  CodeHeader,
  // a DATS entity ("dats:code/5") renders as the entity, any other link opens in a new tab
  a: ({ href, children, ...props }) => {
    const entity = parseDatsLink(href);
    if (entity) return <AgentEntityChip type={entity.type} id={entity.id} />;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  // entity renderers are block elements, which a <p> may not contain
  p: (props) => <div className="aui-md-p" {...props} />,
});

// react-markdown drops links with unknown schemes; DATS entity links are safe
const urlTransform = (url: string) => (url.startsWith(DATS_LINK_SCHEME) ? url : defaultUrlTransform(url));

const MarkdownRoot = styled(MarkdownTextPrimitive)(({ theme }) => ({
  ...theme.typography.body1,
  lineHeight: 1.65,
  overflowWrap: "anywhere",
  "& > :first-of-type": { marginTop: 0 },
  "& > :last-of-type": { marginBottom: 0 },
  "& .aui-md-p": { margin: theme.spacing(1, 0) },
  "& ul, & ol": { margin: theme.spacing(1, 0), paddingLeft: theme.spacing(3) },
  "& li": { margin: theme.spacing(0.25, 0) },
  "& h1, & h2, & h3, & h4": { margin: theme.spacing(2, 0, 1), lineHeight: 1.3 },
  "& h1": { fontSize: "1.4rem" },
  "& h2": { fontSize: "1.25rem" },
  "& h3, & h4": { fontSize: "1.1rem" },
  "& a": { color: theme.palette.primary.main },
  "& :not(pre) > code": {
    fontSize: "0.875em",
    padding: "0.1em 0.35em",
    borderRadius: 4,
    backgroundColor: theme.palette.grey[100],
  },
  "& pre": {
    margin: theme.spacing(0, 0, 1.5),
    padding: theme.spacing(1.5),
    overflowX: "auto",
    fontSize: "0.85rem",
    backgroundColor: theme.palette.grey[100],
    borderRadius: "0 0 8px 8px",
  },
  "& blockquote": {
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(1.5),
    borderLeft: `3px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
  },
  "& table": { borderCollapse: "collapse", margin: theme.spacing(1, 0), display: "block", overflowX: "auto" },
  "& th, & td": { border: `1px solid ${theme.palette.divider}`, padding: theme.spacing(0.5, 1), textAlign: "left" },
  "& th": { backgroundColor: theme.palette.grey[100], fontWeight: 600 },
  "& hr": { border: "none", borderTop: `1px solid ${theme.palette.divider}`, margin: theme.spacing(2, 0) },
}));

/**
 * The text (or reasoning) of the current message part as Markdown. It streams
 * smoothly, shows a dot while the part is still running, and gives code blocks
 * a header with a copy button.
 */
export const AgentMarkdownText = memo(() => {
  return (
    <MarkdownRoot
      className="aui-md"
      remarkPlugins={[remarkGfm]}
      components={markdownComponents}
      urlTransform={urlTransform}
      defer
    />
  );
});
