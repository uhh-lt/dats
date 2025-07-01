import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  styled,
  Tooltip,
  tooltipClasses,
  TooltipProps,
  Typography,
} from "@mui/material";
import * as d3 from "d3";
import { memo } from "react";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { D3ColorScale, d3ColorSchemes } from "./D3ColorScale.ts";

interface TopicSimilarityPlotProps {
  aspectId: number;
  height: number;
  colorName: D3ColorScale;
}

function TopicSimilarityPlot({ aspectId, height, colorName }: TopicSimilarityPlotProps) {
  // global client state
  const colorScheme = useAppSelector((state) => state.atlas.colorScheme);

  // global server state
  const vis = TopicModellingHooks.useGetTopicSimilarities(aspectId);

  const labelFontSize = "0.75rem";
  const cellFontSize = "0.75rem";
  const rowLabelWidth = "32px";
  const colLabelHeight = "28px";
  const colors = d3ColorSchemes[colorName];
  const colorScale = d3.scaleSequential(colors);

  const colorScaleWidth = "40px"; // Width for the color scale
  const numTicks = 5; // Number of ticks on the color scale
  const tickValues = d3.range(0, 1.01, 1 / (numTicks - 1)); // Generate tick values

  return (
    <Card
      variant="outlined"
      sx={{ width: "100%", bgcolor: "grey.300", borderColor: "grey.500", display: "flex", flexDirection: "column" }}
    >
      {(() => {
        if (vis.isLoading || vis.isFetching) {
          return (
            <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
          );
        }
        if (vis.isError) {
          return (
            <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              An Error occurred: {vis.error.message}
            </Box>
          );
        }
        if (vis.isSuccess && vis.data.similarities.length > 0) {
          const numCols = vis.data.similarities[0]?.length || 0;
          return (
            <Box
              sx={{
                height,
                p: 0.5,
                bgcolor: "white",
                flexGrow: 1,
                display: "flex",
                flexDirection: "row",
                overflow: "hidden",
              }}
            >
              {/* Heatmap and Row Labels */}
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Row for (RowLabels + DataGrid) */}
                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "row" }}>
                  {/* Column for Row Labels */}
                  <Box
                    sx={{
                      width: rowLabelWidth,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {vis.data.similarities.map((_, i) => (
                      <HtmlTooltip title={vis.data.topics[i]?.name || `Topic ${i + 1}`}>
                        <Box
                          key={`row-label-${i}`}
                          sx={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: labelFontSize,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            px: 0.5,
                          }}
                        >
                          {getIconComponent(Icon.TOPIC, { style: { color: colorScheme[i % colorScheme.length] } })}
                        </Box>
                      </HtmlTooltip>
                    ))}
                  </Box>
                  {/* Column for Heatmap Grid */}
                  <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    {vis.data.similarities.map((sims, i) => (
                      <Box key={`similarity-row-${i}`} sx={{ display: "flex", flexDirection: "row", flex: 1 }}>
                        {sims.map((sim, j) =>
                          i >= j ? (
                            <Box
                              key={`similarity-${i}-${j}`}
                              sx={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: colorScale(sim),
                                fontSize: cellFontSize,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                color: "lightgrey",
                              }}
                            >
                              {sim.toFixed(2)}
                            </Box>
                          ) : (
                            <Box
                              key={`similarity-${i}-${j}`}
                              sx={{
                                flex: 1,
                                bgcolor: "transparent",
                              }}
                            />
                          ),
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
                {/* Row for Column Labels */}
                {numCols > 0 && (
                  <Box
                    sx={{
                      height: colLabelHeight,
                      display: "flex",
                      flexDirection: "row",
                    }}
                  >
                    {/* Spacer for Row Labels column */}
                    <Box
                      sx={{
                        width: rowLabelWidth,
                      }}
                    />
                    {/* Actual Column Labels */}
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "row" }}>
                      {Array.from({ length: numCols }).map((_, j) => (
                        <HtmlTooltip title={vis.data.topics[j]?.name || `Topic ${j + 1}`}>
                          <Box
                            key={`col-label-${j}`}
                            sx={{
                              flex: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: labelFontSize,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              px: 0.5,
                            }}
                          >
                            {getIconComponent(Icon.TOPIC, { style: { color: colorScheme[j % colorScheme.length] } })}
                          </Box>
                        </HtmlTooltip>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
              {/* Vertical Color Scale */}
              <Box
                sx={{
                  width: colorScaleWidth,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  pl: 0.5,
                }}
              >
                {/* Tick Marks */}
                <Box
                  sx={{
                    background: `linear-gradient(to top, ${colors(0)}, ${colors(0.5)}, ${colors(1)})`,
                    position: "relative",
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  {tickValues.map((value, index) => {
                    // Interpolate color from black (first tick) to white (last tick)
                    const t = index / (tickValues.length - 1);
                    const grey = Math.round(255 * t);
                    const tickColor = `rgb(${grey},${grey},${grey})`;
                    return (
                      <Box
                        key={`tick-${index}`}
                        sx={{
                          width: "100%",
                          textAlign: "center",
                          position: "absolute",
                          bottom: `${value === 0 ? 3 : value === 1 ? 97 : value * 100}%`,
                          transform: "translateY(50%)",
                          fontSize: "0.75rem",
                          color: tickColor,
                        }}
                      >
                        {value.toFixed(1)}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          );
        }
        if (vis.isSuccess && (!vis.data.similarities || vis.data.similarities.length === 0)) {
          return (
            <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              No plot available!
            </Box>
          );
        }
        return null;
      })()}
      <CardContent sx={{ padding: 0.5, pb: "4px !important" }}>
        <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
          Inter-cluster similarities
        </Typography>
      </CardContent>
    </Card>
  );
}

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "white",
    color: theme.palette.text.secondary,
    fontSize: "16px",
    border: "1px solid lightgrey",
    borderRadius: "0px",
    padding: theme.spacing(1),
  },
}));

export default memo(TopicSimilarityPlot);
