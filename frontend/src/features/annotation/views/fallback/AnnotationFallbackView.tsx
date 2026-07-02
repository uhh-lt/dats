import { SidebarContentSidebarLayout } from "@components/content-layouts";
import { Box, Card, CardContent, Container } from "@mui/material";

export function AnnotationFallbackView() {
  return (
    <SidebarContentSidebarLayout
      leftSidebar={<>Unavailable</>}
      content={
        <Box className="h100 myFlexContainer">
          <Box className="myFlexFillAllContainer">
            <Container sx={{ py: 2 }} maxWidth="xl">
              <Card raised>
                <CardContent>
                  <>Please double-click a document in Search to view it here :)</>
                </CardContent>
              </Card>
            </Container>
          </Box>
        </Box>
      }
      rightSidebar={<Box>Unavailable</Box>}
    />
  );
}
