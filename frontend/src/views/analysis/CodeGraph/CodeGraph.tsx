import { Box, Button, Grid, Stack } from "@mui/material";
import { useRef, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeExplorer, { CodeExplorerHandle } from "../../annotation/CodeExplorer/CodeExplorer";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import ForceLayout from "./CodeTree";

import useComputeCodeTree from "./useComputeCodeTree";

const CodeGraph = () => {
  // local state
  const codeExplorerRef = useRef<CodeExplorerHandle>(null);
  const [graphData, setGraphData] = useState<[]>(undefined);

  // custom hooks
  const { codeTree, codes } = useComputeCodeTree();
  const [matchedData, setMatchedData] = useState([]);

  console.log("codeTree", codeTree);
  console.log("codes", codes.data);

  function handleMatchData(ids, data) {
    const matched = [];

    data.forEach((arr) => {
      if (Array.isArray(arr)) {
        const objs = [];
        arr.forEach((obj) => {
          if (ids.includes(obj.id)) {
            objs.push(obj);
          }
        });

        if (objs.length > 0) {
          // Group objects by parent_code_id
          const groupedObjs = objs.reduce((acc, curr) => {
            const key = curr.parent_code_id;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(curr);
            return acc;
          }, {});

          // Push grouped objects to matched array
          Object.values(groupedObjs).forEach((group) => {
            matched.push(group);
          });
        }
      } else {
        if (ids.includes(arr.id)) {
          matched.push([arr]);
        }
      }
    });

    const grouped = matched.reduce((groups, arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((obj) => {
          const key = obj.parent_code_id !== null && obj.parent_code_id !== undefined ? obj.parent_code_id : obj.id;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(obj);
        });
      } else {
        const obj = arr;
        const key = obj.parent_code_id !== null && obj.parent_code_id !== undefined ? obj.parent_code_id : obj.id;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(obj);
      }
      return groups;
    }, {});

    const groupedArray = Object.values(grouped);

    setMatchedData(groupedArray);
    return groupedArray;
  }

  //  function groupObjectsById(idArray, dataArray) {
  //    const result = [];

  //   const matchedObjects = dataArray.filter((obj) => idArray.includes(obj.id) || idArray.includes(obj.parent_code_id));

  //    matchedObjects.forEach((obj) => {
  //      const key = obj.parent_code_id === null ? obj.id : obj.parent_code_id;
  //      let matchingArray = result.find((arr) => arr[0].parent_code_id === key);
  //      if (!matchingArray) {
  //        matchingArray = [];
  //        result.push(matchingArray);
  //      }
  //      matchingArray.push(obj);
  //    });
  //
  //    return result;
  //  }

  const handleGenerateGraph = () => {
    if (!codeExplorerRef.current) return;

    const checkedCodeIds = codeExplorerRef.current.getCheckedCodeIds();
    console.log("checkedCodeIds", checkedCodeIds);
    if (checkedCodeIds.length > 0) {
      // console.log("hello", groupObjectsById(checkedCodeIds, codes.data));
      console.log("mt2", handleMatchData(checkedCodeIds, codes.data));
      // console.log("match data", matchedData);
      // setGraphData(groupObjectsById(checkedCodeIds, codes.data));
      setGraphData(handleMatchData(checkedCodeIds, codes.data));

      // TODO: use the code ids to construct the graph data here
      const nodeA: ICodeTree = {
        code: {
          name: "a",
          color: "green",
          created: "",
          description: "",
          id: 1,
          project_id: 1,
          updated: "",
          user_id: 1,
          parent_code_id: -1,
        },
        children: [],
      };

      const nodeB: ICodeTree = {
        code: {
          name: "b",
          color: "green",
          created: "",
          description: "",
          id: 2,
          project_id: 1,
          updated: "",
          user_id: 1,
          parent_code_id: -1,
        },
        children: [
          {
            code: {
              name: "c",
              color: "green",
              created: "",
              description: "",
              id: 3,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 2,
            },
            children: [],
          },
          {
            code: {
              name: "d",
              color: "green",
              created: "",
              description: "",
              id: 4,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 2,
            },
            children: [],
          },
          {
            code: {
              name: "e",
              color: "green",
              created: "",
              description: "",
              id: 5,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 3,
            },
            children: [],
          },
        ],
      };

      // please do not use a single root node, lets use a graph (e.g. force directed graph) to display the data
      // the graph would not need a single *artificial* root node
    } else {
      setGraphData(undefined);
    }
  };

  return (
    <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
      <Grid item md={3} className="h100">
        <CodeExplorer showCheckboxes={true} ref={codeExplorerRef} />
      </Grid>
      <Grid item md={9} className="myFlexContainer h100">
        <Box className="myFlexFitContent">
          <Stack direction="row" style={{ flexWrap: "wrap", gap: "8px" }}>
            <Button
              variant="contained"
              onClick={handleGenerateGraph}
              sx={{ width: "50%", marginTop: "20px", float: "right" }}
            >
              Generate
            </Button>
          </Stack>
        </Box>
        <div className="myFlexFillAllContainer">{graphData !== undefined && <ForceLayout data={graphData} />}</div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
