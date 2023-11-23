import SaveAltIcon from "@mui/icons-material/SaveAlt";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  IconButton,
  Portal,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { useContext, useRef } from "react";
import { AppBarContext } from "../../../layouts/TwoBarLayout";
import WordFrequencyFilterDialog from "./WordFrequencyFilterDialog";
import WordFrequencyTable from "./WordFrequencyTable";

function WordFrequency() {
  const appBarContainerRef = useContext(AppBarContext);

  // local client state
  const filterDialogAnchorRef = useRef<HTMLDivElement>(null);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Word Frequencies
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={12} className="myFlexContainer h100">
          <Card sx={{ mb: 2, flexShrink: 0 }} elevation={2}>
            <CardContent sx={{ p: 1, pb: "8px !important" }}>
              <Stack direction="row" alignItems="center">
                <WordFrequencyFilterDialog anchorEl={filterDialogAnchorRef.current} />
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title={"Export word frequencies"}>
                  <span>
                    <IconButton disabled>
                      <SaveAltIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </CardContent>
          </Card>
          <WordFrequencyTable onRowContextMenu={() => console.log("HI!")} tableContainerRef={filterDialogAnchorRef} />
        </Grid>
      </Grid>
    </Box>
  );
}

export default WordFrequency;
