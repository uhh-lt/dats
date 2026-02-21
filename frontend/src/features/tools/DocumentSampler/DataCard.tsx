import { Box, CardContent, CardContentProps, CardHeader, CardProps, Typography } from "@mui/material";
import { memo } from "react";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { ChartDataPoint } from "./ChartDataPoint.ts";
import { StartRefreshButton } from "./StartRefreshButton.tsx";
import { selectIsValuesOutdated } from "./documentSamplerSlice.ts";

interface DataCardProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  cardProps?: CardProps;
  cardContentProps?: CardContentProps;
  onDataRefresh: () => void;
  renderData: (chartData: ChartDataPoint[]) => React.ReactNode;
}

export const DataCard = memo((
  {
    title,
    description,
    action,
    cardProps = {},
    cardContentProps,
    onDataRefresh,
    renderData,
  }: DataCardProps
) => {
  // global client state (redux)
  const chartData = useAppSelector((state) => state.documentSampler.chartData);
  const isOutdated = useAppSelector(selectIsValuesOutdated);

  return (
    <CardContainer className={`myFlexContainer ${cardProps.className}`}>
      <CardHeader className="myFlexFitContentContainer" action={action} title={title} subheader={description} />
      <CardContent className="myFlexFillAllContainer" style={{ position: "relative" }} {...cardContentProps}>
        {chartData.length === 0 ? (
          <Box
            width="100%"
            height="100%"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexDirection="column"
          >
            <Typography variant="body1" color="textSecondary">
              No data to display. Define groups and set the sampling strategy.
            </Typography>
            <StartRefreshButton isRefresh={false} onClick={onDataRefresh} />
          </Box>
        ) : (
          <>
            {renderData(chartData)}
            {isOutdated && (
              <Box
                position="absolute"
                top={0}
                left={0}
                right={0}
                bottom={0}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                bgcolor={"rgba(255, 255, 255, 0.5)"}
              >
                <Typography variant="h4" color="textSecondary">
                  Data is outdated, please refresh
                </Typography>
                <StartRefreshButton isRefresh={true} onClick={onDataRefresh} />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </CardContainer>
  );
});
