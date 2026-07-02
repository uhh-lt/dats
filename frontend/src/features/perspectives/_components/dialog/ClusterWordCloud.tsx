import { ReactWordcloud } from "@cp949/react-wordcloud";
import { ClusterRead } from "@models/ClusterRead";
import { Box, Card, Typography } from "@mui/material";
import { useMemo } from "react";
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

const colors = ["#143059", "#2F6B9A", "#82a6c2"];
const clusterWordCloudOptions = {
  colors,
  deterministic: true,
  fontFamily: "Impact",
  fontSizes: [10, 100] as [number, number],
  padding: 2,
  rotationAngles: [0, 0] as [number, number],
  scale: "log" as const,
  spiral: "rectangular" as const,
};

interface ClusterWordCloudContentProps {
  width: number;
  height: number;
  topWords: string[];
  topWordScores: number[];
}

function ClusterWordCloudContent({ width, height, topWords, topWordScores }: ClusterWordCloudContentProps) {
  const words = useMemo(() => {
    const words = topWords.map((w, index) => ({
      text: w,
      value: topWordScores[index],
    }));

    // Log scaling expects positive values.
    return words.filter((w) => w.value > 0);
  }, [topWords, topWordScores]);

  return <ReactWordcloud words={words} options={clusterWordCloudOptions} size={[width, height]} />;
}
