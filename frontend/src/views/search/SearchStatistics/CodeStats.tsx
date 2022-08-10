import { Button, Stack } from "@mui/material";
import React, { useMemo } from "react";

interface CodeStatsProps {
  codeId: number;
  data: Map<string, number>;
  handleClick: (codeId: number, text: string) => void;
}

function CodeStats({ codeId, data, handleClick }: CodeStatsProps) {
  const sortedData = useMemo(() => {
    return Array.from(data.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const maxValue = sortedData.length > 0 ? sortedData[0][1] : 0;

  return (
    <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
      {sortedData.map(([text, count]) => (
        <Button
          key={text}
          sx={{ width: `${(count / maxValue) * 100}%`, justifyContent: "left" }}
          variant="outlined"
          onClick={() => handleClick(codeId, text)}
        >
          {text}: {count}
        </Button>
      ))}
    </Stack>
  );
}

export default CodeStats;
