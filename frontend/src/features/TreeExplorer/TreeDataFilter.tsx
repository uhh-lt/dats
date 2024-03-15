import { Divider, TextField, Toolbar, Typography } from "@mui/material";
import { useEffect } from "react";
import { Node } from "ts-tree-structure";
import { IDataTree } from "./IDataTree";
import { filterTree } from "./TreeUtils";
import { UseQueryResult } from "@tanstack/react-query";
import { CodeRead, DocumentTagRead } from "../../api/openapi";
import { KEYWORD_TAGS } from "../../utils/GlobalConstants";

interface TreeDataFilterProps {
  allData: UseQueryResult<CodeRead[] | DocumentTagRead[], Error>;
  setNodesToExpand: React.Dispatch<React.SetStateAction<Set<number>>>;
  setFilteredDataTree: React.Dispatch<React.SetStateAction<Node<IDataTree>>>;
  dataTree: Node<IDataTree>;
  dataFilter: string;
  setDataFilter: React.Dispatch<React.SetStateAction<string>>;
  dataType: string;
  actions: React.ReactNode;
}

export function TreeDataFilter({
  allData,
  setNodesToExpand,
  setFilteredDataTree,
  dataTree,
  dataFilter,
  setDataFilter,
  dataType,
  actions,
}: TreeDataFilterProps) {
  useEffect(() => {
    if (allData.data) {
      const filteredData = filterTree({
        dataTree: dataTree,
        dataFilter: dataFilter,
        dataType: dataType,
      });
      setNodesToExpand(filteredData.nodesToExpand);
      setFilteredDataTree(filteredData.dataTree);
    }
  }, [allData.data, dataFilter, dataTree, dataType, setFilteredDataTree, setNodesToExpand]);

  return (
    <>
      {" "}
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
            setDataFilter(event.target.value);
          }}
        />
        {actions}
      </Toolbar>
      <Divider />
    </>
  );
}
