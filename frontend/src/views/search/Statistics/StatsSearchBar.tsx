import SearchIcon from "@mui/icons-material/Search";
import { Stack, TextField } from "@mui/material";
import React from "react";
interface StatsSearchBarProps {
  handleSearchTextChange: React.ChangeEventHandler<HTMLInputElement>;
}

function StatsSearchBar({ handleSearchTextChange }: StatsSearchBarProps) {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2} px={2}>
        <SearchIcon sx={{ color: "dimgray" }} />
        <TextField
          sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
          placeholder="Search..."
          variant="outlined"
          onChange={handleSearchTextChange}
        />
      </Stack>
    </>
  );
}
export default StatsSearchBar;
