import { Card } from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useCallback, useMemo } from "react";
import { ClusterRead } from "../../../api/openapi/models/ClusterRead.ts";

const fixedValueGenerator = () => 0.5;
const colors = ["#143059", "#2F6B9A", "#82a6c2"];

interface ClusterWordCloudProps {
  width: number;
  height: number;
  cluster: ClusterRead;
}
function ClusterWordCloud({ width, height, cluster }: ClusterWordCloudProps) {
  const fontSizeSetter = useCallback(
    (datum: { text: string; value: number }) => {
      const fontScale = scaleLog({
        domain: [Math.min(...cluster.top_word_scores!), Math.max(...cluster.top_word_scores!)],
        range: [10, 100],
      });

      return fontScale(datum.value);
    },
    [cluster],
  );

  const words = useMemo(() => {
    return cluster.top_words!.map((w, index) => ({
      text: w,
      value: cluster.top_word_scores![index],
    }));
  }, [cluster]);

  return (
    <Card variant="outlined" sx={{ height, borderColor: "grey.500" }}>
      <Wordcloud
        words={words}
        width={width}
        height={height}
        fontSize={fontSizeSetter}
        font={"Impact"}
        padding={2}
        spiral="rectangular"
        rotate={0}
        random={fixedValueGenerator}
      >
        {(cloudWords) =>
          cloudWords.map((w, i) => (
            <Text
              key={w.text}
              fill={colors[i % colors.length]}
              textAnchor={"middle"}
              transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
              fontSize={w.size}
              fontFamily={w.font}
            >
              {w.text}
            </Text>
          ))
        }
      </Wordcloud>
    </Card>
  );
}

export default ClusterWordCloud;
