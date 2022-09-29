import { Button, Stack } from "@mui/material";
import React from "react";
import { SpanEntityDocumentFrequency } from "../../../api/openapi";

interface CodeStatsProps {
  data: SpanEntityDocumentFrequency[];
  handleClick: (stat: SpanEntityDocumentFrequency) => void;
}

function CodeStats({ data, handleClick }: CodeStatsProps) {
  const maxValue = data.length > 0 ? data[0].count : 0;

  return (
    <Stack sx={{ whiteSpace: "nowrap" }} spacing={0.5}>
      {data.map((stat) => (
        <Button
          key={stat.span_text}
          sx={{ width: `${(stat.count / maxValue) * 100}%`, justifyContent: "left" }}
          variant="outlined"
          onClick={() => handleClick(stat)}
        >
          {stat.span_text}: {stat.count}
        </Button>
      ))}
    </Stack>
  );
}

export default CodeStats;
