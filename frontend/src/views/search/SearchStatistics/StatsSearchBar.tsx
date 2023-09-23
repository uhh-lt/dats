import { TextField } from "@mui/material";
import React from "react";

interface StatsSearchBarProps {
    onSearchTextChange : any;
}


function StatsSearchBar({onSearchTextChange}:StatsSearchBarProps){

return (
<TextField sx={{"& fieldset": { border: 'none' },}} placeholder="Search" variant="outlined" onChange={onSearchTextChange}/>
)
}
export default StatsSearchBar;