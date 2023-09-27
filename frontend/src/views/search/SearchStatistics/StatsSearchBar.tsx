import { TextField } from "@mui/material";
import React from "react";

interface StatsSearchBarProps {
  handleSearchTextChange: React.ChangeEventHandler<HTMLInputElement>;
}

function StatsSearchBar({ handleSearchTextChange }: StatsSearchBarProps) {
  return (
    <TextField
      sx={{ "& fieldset": { border: "none" } }}
      placeholder="Search"
      variant="outlined"
      onChange={handleSearchTextChange}
    />
  );
}
export default StatsSearchBar;
