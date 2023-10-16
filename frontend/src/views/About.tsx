import React from "react";
import { Container, Typography } from "@mui/material";

function About() {
  return (
    <Container
      maxWidth="md"
      sx={{
        overflow: "auto",
        height: "100%",
        "-ms-overflow-style": "none",
        "::-webkit-scrollbar": {
          display: "none",
        },
      }}
    >
      <Typography variant={"h3"} gutterBottom mt={3}>
        About
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        This is the about page of the D-WISE Tool Suite. Read further to learn more about the D-WISE Project and Tool
        Suite. More information can be found on the D-WISE website (
        <a href="https://www.dwise.uni-hamburg.de/en.html">link</a>).
      </Typography>
      <Typography variant={"h4"} gutterBottom mt={3}>
        The D-WISE Project
      </Typography>
      <Typography variant={"subtitle1"} gutterBottom>
        Digitale Wissenssoziologische Diskursanalyse (D-WISE)
        <br />
        Multimodale Bedeutungsanalysen in Grounded Theory geleiteten Forschungsprozessen
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        BMBF-funded joint research project D-WISE aims to develop new IT-analysis approaches as digital support for the
        Sociology of Knowledge Approach to Discourse Analysis. D-WISE addresses for which purposes, when, and how
        methods of the digital humanities can be meaningfully integrated into qualitative discourse-analytical knowledge
        production.
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        The research project is a collaboration between the{" "}
        <a href={"https://www.kulturwissenschaften.uni-hamburg.de/ekw.html"}>
          Institute of Anthropological Studies in Culture and History
        </a>{" "}
        and the <a href={"https://www.inf.uni-hamburg.de/en/inst/ab/lt/home.html"}>Language Technology Group</a> at the
        University of Hamburg.
      </Typography>
      <Typography variant={"h4"} gutterBottom mt={3}>
        The D-WISE Tool Suite (DWTS)
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        The D-WISE Tool Suite (DWTS) is a web-based open-source tool for the digital support of sociological discourse
        analyzes (WDA) where hermeneutic-circular methods, filtering, scalable reading and coding are the dominant
        principles. In addition, collaboration, the mutually complementary combination of human-in-the-loop and
        AI-in-the-loop, multimodality and big data are core topics and were therefore taken into account from the very
        beginning when developing the tool.
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        The DWTS aims to overcome challenges that researchers face with regard to methodological approaches from the
        Digital Humanities (DH), discourse analysis and the increasing use of open corpora, consisting of heterogeneous,
        multimodal and large amounts of data
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        To this end, the D-WISE Tool Suite expands the existing range of DH methods and improves the research process
        using artificial intelligence-supported functionalities and partially automated processes.
      </Typography>
    </Container>
  );
}

export default About;

// Refer here on how to use react-grid-layout, if necessary in the future!
// import { Responsive, WidthProvider } from "react-grid-layout";
// import DocumentExplorer from "../features/document-explorer/DocumentExplorer";
// import { Box } from "@mui/material";
//
// const ResponsiveGridLayout = WidthProvider(Responsive);
//
// interface ClosableProps {
//   handleClose: () => void;
//   children?: React.ReactNode;
// }
//
// function Closable({ handleClose, children }: ClosableProps) {
//   return (
//     <React.Fragment>
//       <div className="hide-button" onClick={() => handleClose()}>
//         &times;
//       </div>
//       {children}
//     </React.Fragment>
//   );
// }
//
// function About() {
//   const layout = [
//     { i: "a", x: 0, y: 0, w: 1, h: 2 },
//     { i: "b", x: 1, y: 0, w: 3, h: 2 },
//     { i: "c", x: 4, y: 0, w: 1, h: 2 },
//     { i: "d", x: 5, y: 0, w: 2, h: 2 },
//   ];
//
//   const handleClose = () => {
//     console.log("Close!");
//   };
//
//   return (
//     <ResponsiveGridLayout
//       className="layout"
//       layouts={{ lg: layout }}
//       breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
//       cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
//       rowHeight={100}
//       draggableHandle=".DragHandle"
//     >
//       <div key="a">
//         <Closable handleClose={handleClose}>
//           <div>Tim</div>
//         </Closable>
//       </div>
//       <div key="b">
//         <Box sx={{ width: "100%", height: "100%", bgcolor: "red", display: "flex", flexDirection: "column", p: 1 }}>
//           <Box sx={{ height: 32, width: "100%", bgcolor: "blue", flexGrow: 0 }}>Tom</Box>
//           <Box sx={{ bgcolor: "green", flexGrow: 1 }}>Tim</Box>
//         </Box>
//       </div>
//       <div key="c">
//         <Closable handleClose={handleClose}>
//           <DocumentExplorer />
//         </Closable>
//       </div>
//       <div key="d">
//         <Closable handleClose={handleClose}>
//           <div>Tim</div>
//         </Closable>
//       </div>
//       <div key="e">
//         <Closable handleClose={handleClose}>Test</Closable>
//       </div>
//       <div key="f">
//         <Closable handleClose={handleClose}>
//           <div>Tim</div>
//         </Closable>
//       </div>
//     </ResponsiveGridLayout>
//   );
// }
//
// export default About;
