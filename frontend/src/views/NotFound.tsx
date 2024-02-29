import { Box, Button, Container, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

function NotFound() {
  return (
    <Container maxWidth="md">
      <Typography variant={"h3"} gutterBottom mt={3} textAlign="center">
        Whoops!
      </Typography>
      <Typography variant={"h5"} gutterBottom mt={3} textAlign="center">
        404 Page Not Found
      </Typography>
      <Typography variant={"body1"} gutterBottom mt={3} textAlign="center">
        We can't find the page you're looking for. Go back to projects?
      </Typography>
      <Box display="flex" mt={5}>
        <Button component={RouterLink} to={"/projects"} variant="contained" color="primary" sx={{ mx: "auto" }}>
          Return to projects
        </Button>
      </Box>
    </Container>
  );
}

export default NotFound;
