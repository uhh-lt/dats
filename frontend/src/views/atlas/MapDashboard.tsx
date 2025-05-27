import CheckIcon from "@mui/icons-material/Check";
import ReplyIcon from "@mui/icons-material/Reply";
import { Box, Button, Card, CardContent, CardMedia, Chip, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";

function MapDashboard() {
  return (
    <ContentContainerLayout>
      <Stack spacing={2}>
        <Stack spacing={2} direction={"row"} alignItems="flex-start" justifyContent="space-between">
          <Box maxWidth="66%">
            <Stack direction={"row"} spacing={2} alignItems="center">
              <Typography variant="h5" color="primary">
                Tims Map #1
              </Typography>
              <Chip icon={<CheckIcon />} label="Ready" variant="outlined" color="success" />
            </Stack>
            <Typography pt={1}>
              A description of your Map, this map is about financial data and their usages with AI slop. We are not AI!
              A description of your Map, this map is about financial data and their usages with AI slop. We are not AI!
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            endIcon={<ReplyIcon sx={{ transform: "rotate(90deg)" }} />}
            component={RouterLink}
            to="./map"
          >
            Open Map
          </Button>
        </Stack>

        <Stack spacing={4} direction={"row"}>
          <Box width="400px">
            <Typography variant="button">Map</Typography>
            <Card>
              <CardMedia
                sx={{ height: 350 }}
                image="https://mui.com/static/images/cards/contemplative-reptile.jpg"
                title="green iguana"
              />
              <CardContent sx={{ padding: 0.5, pb: "4px !important" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
                  This map is cool!
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Box>
            <Typography variant="button">Data Statistics</Typography>
          </Box>
        </Stack>
      </Stack>
    </ContentContainerLayout>
  );
}

export default MapDashboard;
