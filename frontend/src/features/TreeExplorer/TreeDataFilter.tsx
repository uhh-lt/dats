import SearchIcon from "@mui/icons-material/Search";
import { Divider, Stack, TextField } from "@mui/material";
import { useEffect } from "react";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { IDataTree } from "./IDataTree.ts";
import { filterTree } from "./TreeUtils.ts";

interface TreeDataFilterProps {
  allData: CodeRead[] | DocumentTagRead[];
  setNodesToExpand: React.Dispatch<React.SetStateAction<Set<number>>>;
  setFilteredDataTree: React.Dispatch<React.SetStateAction<Node<IDataTree>>>;
  dataTree: Node<IDataTree>;
  dataFilter: string;
  onDataFilterChange: (newDataFilter: string) => void;
  actions: React.ReactNode;
}

export function TreeDataFilter({
  allData,
  setNodesToExpand,
  setFilteredDataTree,
  dataTree,
  dataFilter,
  onDataFilterChange,
  actions,
}: TreeDataFilterProps) {
  useEffect(() => {
    const filteredData = filterTree({
      dataTree: dataTree,
      dataFilter: dataFilter,
    });
    setNodesToExpand(filteredData.nodesToExpand);
    setFilteredDataTree(filteredData.dataTree);
  }, [allData, dataFilter, dataTree, setFilteredDataTree, setNodesToExpand]);

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
