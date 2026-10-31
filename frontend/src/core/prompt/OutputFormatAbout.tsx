import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button, Collapse } from "@mui/material";
import { useCallback, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OutputFormatAboutProps {
  // the name of the output format, e.g. "Quotes with context"
  name: string;
  // markdown: how the format works, an example and when to use it
  details: string;
}

/** A collapsible explanation of an output format. */
export function OutputFormatAbout({ name, details }: OutputFormatAboutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const handleToggle = useCallback(() => setIsOpen((current) => !current), []);

  return (
    <Box sx={{ borderLeft: 3, borderColor: "primary.main", pl: 2 }}>
      <Button
        size="small"
        endIcon={
          <ExpandMoreIcon sx={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
        }
        onClick={handleToggle}
      >
        About {name}
      </Button>
      <Collapse in={isOpen}>
        <Box className="markdown-content" sx={{ pt: 1 }}>
          <Markdown remarkPlugins={[remarkGfm]}>{details}</Markdown>
        </Box>
      </Collapse>
    </Box>
  );
}
