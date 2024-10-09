import SearchIcon from "@mui/icons-material/Search";
import { Divider, Stack, TextField } from "@mui/material";

interface TreeDataFilterProps {
  dataFilter: string;
  onDataFilterChange: (newDataFilter: string) => void;
  actions: React.ReactNode;
}

export function TreeDataFilter({ dataFilter, onDataFilterChange, actions }: TreeDataFilterProps) {
  return (
    <>
      <Stack direction="row" alignItems="center" spacing={2} pl={2} pr={1}>
        <SearchIcon sx={{ color: "dimgray" }} />
        <TextField
          sx={{ "& fieldset": { border: "none" }, input: { color: "dimgray", paddingY: "12px" } }}
          fullWidth
          placeholder="Search..."
          variant="outlined"
          value={dataFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            onDataFilterChange(event.target.value);
          }}
        />
        {actions}
      </Stack>
      <Divider />
    </>
  );
}
