import { Stack, TextField } from "@mui/material";
import React from "react";
import SearchIcon from "@mui/icons-material/Search";
interface StatsSearchBarProps {
  handleSearchTextChange: React.ChangeEventHandler<HTMLInputElement>;
}

function StatsSearchBar({ handleSearchTextChange }: StatsSearchBarProps) {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1}>
        <SearchIcon sx={{ color: "dimgray", ml: 1.5 }} />
        <TextField
          sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray" } }}
          placeholder="Search..."
          variant="outlined"
          onChange={handleSearchTextChange}
        />
      </Stack>
    </>
  );
}
export default StatsSearchBar;
