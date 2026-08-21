import SearchIcon from "@mui/icons-material/Search";
import { IconButton, TextField, Tooltip } from "@mui/material";
import { useState } from "react";

interface SearchToggleProps {
  searchQuery: string;
  placeholder: string;
  onSearchQueryChange: (value: string) => void;
}

/** Search button that expands into a search field; owns its expanded state. */
export function SearchToggle({ searchQuery, placeholder, onSearchQueryChange }: SearchToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {expanded ? (
        <TextField
          autoFocus
          size="small"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          sx={{ width: 220 }}
        />
      ) : null}
      <Tooltip title="Search">
        <IconButton
          size="small"
          color={expanded || searchQuery ? "primary" : "default"}
          onClick={() => setExpanded((current) => !current)}
        >
          <SearchIcon />
        </IconButton>
      </Tooltip>
    </>
  );
}
