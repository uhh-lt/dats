import { Box, Container, Typography } from "@mui/material";
import { Outlet } from "react-router-dom";

function Feedback() {
  return (
    <Box style={{ height: "100%", overflowY: "auto" }}>
      <Container maxWidth="md">
        <Typography variant={"h4"} gutterBottom mt={3}>
          Feedback:
        </Typography>
        <Outlet />
      </Container>
    </Box>
  );
}

export default Feedback;
