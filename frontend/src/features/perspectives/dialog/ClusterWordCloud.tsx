import { Box, Card, Typography } from "@mui/material";
import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useCallback, useMemo } from "react";
import { ClusterRead } from "../../../api/openapi/models/ClusterRead.ts";
interface ClusterWordCloudProps {
  width: number;
  height: number;
  cluster: ClusterRead;
}

export function ClusterWordCloud({ width, height, cluster }: ClusterWordCloudProps) {
  const hasData =
    cluster.top_words &&
    cluster.top_word_scores &&
    cluster.top_words.length > 0 &&
    cluster.top_words.length === cluster.top_word_scores.length;

  return (
    <Card variant="outlined" sx={{ height, borderColor: "grey.500" }}>
      {!hasData ? (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No word cloud data available.
          </Typography>
        </Box>
      ) : (
        <ClusterWordCloudContent
          width={width}
          height={height}
          topWords={cluster.top_words!}
          topWordScores={cluster.top_word_scores!}
        />
      )}
    </Card>
  );
}

const fixedValueGenerator = () => 0.5;
const colors = ["#143059", "#2F6B9A", "#82a6c2"];

interface ClusterWordCloudContentProps {
  width: number;
  height: number;
  topWords: string[];
  topWordScores: number[];
}

function ClusterWordCloudContent({ width, height, topWords, topWordScores }: ClusterWordCloudContentProps) {
  const { words, domain } = useMemo(() => {
    const words = topWords.map((w, index) => ({
      text: w,
      value: topWordScores[index],
    }));

    // filter out words with score 0
    const filteredWords = words.filter((w) => w.value > 0);
    const filteredValues = filteredWords.map((w) => w.value);

    // Handle case where filteredValues might be empty to avoid Math.min/max errors
    const minDomain = filteredValues.length > 0 ? Math.min(...filteredValues) : 1; // Default to 1 or some sensible minimum
    const maxDomain = filteredValues.length > 0 ? Math.max(...filteredValues) : minDomain + 1; // Ensure max is greater than min if only one element or empty
    const domain = [minDomain, maxDomain];

    return {
      words: filteredWords,
      domain: domain,
    };
  }, [topWords, topWordScores]);

  const fontSizeSetter = useCallback(
    (datum: { text: string; value: number }) => {
      const fontScale = scaleLog({
        domain: domain,
        range: [10, 100],
      });

      return fontScale(datum.value);
    },
    [domain],
  );

  return (
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
  );
}
