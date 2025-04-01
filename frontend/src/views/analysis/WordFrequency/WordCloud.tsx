import { scaleLog } from "@visx/scale";
import { Text } from "@visx/text";
import { Wordcloud } from "@visx/wordcloud";
import { useState } from "react";
import { WordFrequencyStat } from "../../../api/openapi/models/WordFrequencyStat.ts";

interface WordCloudProps {
  width: number;
  height: number;
  words: WordFrequencyStat[];
  showControls?: boolean;
}

const colors = ["#143059", "#2F6B9A", "#82a6c2"];

function getRotationDegree() {
  const rand = Math.random();
  const degree = rand > 0.5 ? 60 : -60;
  return rand * degree;
}

const fixedValueGenerator = () => 0.5;

type SpiralType = "archimedean" | "rectangular";

export default function WordCloud({ width, height, words, showControls = true }: WordCloudProps) {
  const [spiralType, setSpiralType] = useState<SpiralType>("archimedean");
  const [withRotation, setWithRotation] = useState<boolean>(false);

  const fontScale = scaleLog({
    domain: [Math.min(...words.map((w) => w.count)), Math.max(...words.map((w) => w.count))],
    range: [10, 100],
  });

  const fontSizeSetter = (datum: { text: string; value: number }) => {
    return fontScale(datum.value);
  };

  return (
    <div className="wordcloud">
      <Wordcloud
        words={words.map((w) => ({ text: w.word, value: w.count }))}
        width={width}
        height={height}
        fontSize={fontSizeSetter}
        font={"Impact"}
        padding={2}
        spiral={spiralType}
        rotate={withRotation ? getRotationDegree : 0}
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
      {showControls && (
        <div>
          <label>
            Spiral type &nbsp;
            <select onChange={(e) => setSpiralType(e.target.value as SpiralType)} value={spiralType}>
              <option key={"archimedean"} value={"archimedean"}>
                archimedean
              </option>
              <option key={"rectangular"} value={"rectangular"}>
                rectangular
              </option>
            </select>
          </label>
          <label>
            With rotation &nbsp;
            <input type="checkbox" checked={withRotation} onChange={() => setWithRotation(!withRotation)} />
          </label>
        </div>
      )}
      <style>
        {`
          .wordcloud {
            display: flex;
            flex-direction: column;
            user-select: none;
          }
          .wordcloud svg {
            margin: 1rem 0;
            cursor: pointer;
          }
          .wordcloud label {
            display: inline-flex;
            align-items: center;
            font-size: 14px;
            margin-right: 8px;
          }
        `}
      </style>
    </div>
  );
}
