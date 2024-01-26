import { Box, Card, CardContent, CardHeader, Container, Portal, Typography } from "@mui/material";
import { ReactNode, useContext } from "react";
import { AppBarContext } from "../../layouts/TwoBarLayout";

interface AnalysisDashboardProps {
  children: ReactNode;
  pageTitle: string;
  headerTitle: string;
  headerCards: ReactNode;
  bodyTitle: string;
}

export default function AnalysisDashboard(props: AnalysisDashboardProps) {
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          {props.pageTitle}
        </Typography>
      </Portal>

      <Container maxWidth="xl" className="h100" style={{ display: "flex", flexDirection: "column" }} sx={{ py: 2 }}>
        <Card sx={{ width: "100%", maxHeight: "400px", mb: 2 }} elevation={2} className="myFlexContainer">
          <CardHeader title={props.headerTitle} />
          <CardContent className="myFlexFillAllContainer">
            <Box height="100%" overflow="auto" whiteSpace="nowrap" style={{ display: "flex", alignItems: "stretch" }}>
              {props.headerCards}
            </Box>
          </CardContent>
        </Card>
        <Card
          sx={{ width: "100%", minHeight: "225.5px" }}
          elevation={2}
          className="myFlexFillAllContainer myFlexContainer"
        >
          <CardHeader title="Load whiteboard" />
          <CardContent className="myFlexFillAllContainer" style={{ padding: 0 }}>
            <div className="h100" style={{ width: "100%" }}>
              {props.children}
            </div>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
