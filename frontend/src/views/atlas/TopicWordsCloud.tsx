import { Card } from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useCallback, useMemo } from "react";
import { TopicRead } from "../../api/openapi/models/TopicRead.ts";

const fixedValueGenerator = () => 0.5;
const colors = ["#143059", "#2F6B9A", "#82a6c2"];

interface TopicWordsCloudProps {
  width: number;
  height: number;
  topic: TopicRead;
}
function TopicWordsCloud({ width, height, topic }: TopicWordsCloudProps) {
  const fontSizeSetter = useCallback(
    (datum: { text: string; value: number }) => {
      const fontScale = scaleLog({
        domain: [Math.min(...topic.top_word_scores!), Math.max(...topic.top_word_scores!)],
        range: [10, 100],
      });

      return fontScale(datum.value);
    },
    [topic],
  );

  const words = useMemo(() => {
    return topic.top_words!.map((w, index) => ({
      text: w,
      value: topic.top_word_scores![index],
    }));
  }, [topic]);

  return (
    <Card variant="outlined" sx={{ height }}>
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

export default TopicWordsCloud;
