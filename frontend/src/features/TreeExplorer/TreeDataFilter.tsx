import { Divider, TextField, Toolbar, Typography } from "@mui/material";
import { useEffect } from "react";
import { Node } from "ts-tree-structure";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants.ts";
import { IDataTree } from "./IDataTree.ts";
import { filterTree } from "./TreeUtils.ts";

interface TreeDataFilterProps {
  allData: CodeRead[] | DocumentTagRead[];
  setNodesToExpand: React.Dispatch<React.SetStateAction<Set<number>>>;
  setFilteredDataTree: React.Dispatch<React.SetStateAction<Node<IDataTree>>>;
  dataTree: Node<IDataTree>;
  dataFilter: string;
  onDataFilterChange: (newDataFilter: string) => void;
  dataType: string;
  actions: React.ReactNode;
}

export function TreeDataFilter({
  allData,
  setNodesToExpand,
  setFilteredDataTree,
  dataTree,
  dataFilter,
  onDataFilterChange,
  dataType,
  actions,
}: TreeDataFilterProps) {
  useEffect(() => {
    const filteredData = filterTree({
      dataTree: dataTree,
      dataFilter: dataFilter,
      dataType: dataType,
    });
    setNodesToExpand(filteredData.nodesToExpand);
    setFilteredDataTree(filteredData.dataTree);
  }, [allData, dataFilter, dataTree, dataType, setFilteredDataTree, setNodesToExpand]);

  return (
    <>
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          {"Filter " + (dataType === KEYWORD_TAGS ? "Tags" : "Codes")}
        </Typography>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder={"type name here..."}
          variant="outlined"
          size="small"
          value={dataFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            onDataFilterChange(event.target.value);
          }}
        />
        {actions}
      </Toolbar>
      <Divider />
    </>
  );
}
