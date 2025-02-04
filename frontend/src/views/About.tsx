import { Card, CardContent, Typography } from "@mui/material";
import NoSidebarLayout from "../layouts/NoSidebarLayout.tsx";

function About() {
  return (
    <NoSidebarLayout>
      <Card>
        <CardContent>
          <Typography variant={"h3"} gutterBottom mt={3}>
            About
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            This is the about page of the Discourse Analysis Tool Suite. Read further to learn more about the D-WISE
            Project and Discourse Analysis Tool Suite. More information can be found on the D-WISE website (
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
            BMBF-funded joint research project D-WISE aims to develop new IT-analysis approaches as digital support for
            the Sociology of Knowledge Approach to Discourse Analysis. D-WISE addresses for which purposes, when, and
            how methods of the digital humanities can be meaningfully integrated into qualitative discourse-analytical
            knowledge production.
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            The research project is a collaboration between the{" "}
            <a href={"https://www.kulturwissenschaften.uni-hamburg.de/ekw.html"}>
              Institute of Anthropological Studies in Culture and History
            </a>{" "}
            and the <a href={"https://www.inf.uni-hamburg.de/en/inst/ab/lt/home.html"}>Language Technology Group</a> at
            the University of Hamburg.
          </Typography>
          <Typography variant={"h4"} gutterBottom mt={3}>
            The Discourse Analysis Tool Suite (DATS)
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            The Discourse Analysis Tool Suite (DATS) is a web-based open-source tool for the digital support of
            sociological discourse analyzes (WDA) where hermeneutic-circular methods, filtering, scalable reading and
            coding are the dominant principles. In addition, collaboration, the mutually complementary combination of
            human-in-the-loop and AI-in-the-loop, multimodality and big data are core topics and were therefore taken
            into account from the very beginning when developing the tool.
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            The DATS aims to overcome challenges that researchers face with regard to methodological approaches from the
            Digital Humanities (DH), discourse analysis and the increasing use of open corpora, consisting of
            heterogeneous, multimodal and large amounts of data
          </Typography>
          <Typography variant={"body1"} gutterBottom>
            To this end, the Discourse Analysis Tool Suite expands the existing range of DH methods and improves the
            research process using artificial intelligence-supported functionalities and partially automated processes.
          </Typography>
        </CardContent>
      </Card>
    </NoSidebarLayout>
  );
}

export default About;
