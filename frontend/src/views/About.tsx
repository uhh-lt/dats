import React from "react";

function About() {
  return <>This is the about page!</>;
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
