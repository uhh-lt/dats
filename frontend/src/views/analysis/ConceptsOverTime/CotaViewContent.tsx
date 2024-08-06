import { Box, Grid } from "@mui/material";
import { COTARead } from "../../../api/openapi/models/COTARead.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import CotaConceptList from "./CotaConceptList.tsx";
import CotaControl from "./CotaControl.tsx";
import CotaScatterPlotly from "./CotaScatterPlotly.tsx";
import CotaSentenceAnnotator2 from "./CotaSentenceAnnotator.tsx";
import CotaTimelinePlot from "./CotaTimelinePlot.tsx";
import CotaTimelineSettings from "./CotaTimelineSettings.tsx";

interface CotaViewContentProps {
  cota: COTARead;
}

function CotaViewContent({ cota }: CotaViewContentProps) {
  // global client state (redux)
  const isTimelineView = useAppSelector((state) => state.cota.isTimelineView);

  return (
    <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
      <Grid item md={3} className="myFlexContainer h100">
        <Box className="myFlexFitContentContainer" sx={{ mb: 2 }}>
          {isTimelineView ? <CotaTimelineSettings cota={cota} /> : <CotaControl cota={cota} />}
        </Box>
        <Box className="myFlexFillAllContainerNoScroll">
          <CotaConceptList cota={cota} />
        </Box>
      </Grid>
      <Grid item md={9} className="h100">
        <Box style={{ height: "50%" }} sx={{ pb: 1 }}>
          {isTimelineView ? <CotaTimelinePlot cota={cota} /> : <CotaScatterPlotly cota={cota} />}
        </Box>
        <Box style={{ height: "50%" }} sx={{ pt: 1 }}>
          <CotaSentenceAnnotator2 cota={cota} />
        </Box>
      </Grid>
    </Grid>
  );
}

export default CotaViewContent;
