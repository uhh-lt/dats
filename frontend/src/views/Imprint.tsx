import React from "react";
import { Container, Typography } from "@mui/material";

function Imprint() {
  return (
    <Container maxWidth="md">
      <Typography variant={"h3"} gutterBottom mt={3}>
        Imprint
      </Typography>
      <Typography variant={"h4"} gutterBottom mt={3}>
        According to § 5 TMG
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        Universität Hamburg - Language Technology Group
        <br />
        Informatikum
        <br />
        Vogt-Kölln-Straße 30
        <br />
        22527 Hamburg
      </Typography>
      <Typography variant={"body1"} gutterBottom mt={1}>
        <b>Represented by:</b>
        <br />
        Chris Biemann, Tim Fischer, Florian Schneider
      </Typography>
      <Typography variant={"h4"} gutterBottom mt={3}>
        Contact information
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        <b>Phone:</b> +49 40 42883 2387
        <br />
        <b>E-Mail:</b> tim.fischer(at)uni-hamburg.de
      </Typography>
      <Typography variant={"h4"} gutterBottom mt={3}>
        Consumer dispute resolution
      </Typography>
      <Typography variant={"body1"} gutterBottom>
        We are not willing or obliged to participate in any dispute resolution procedure participate in the consumer
        arbitration board.
      </Typography>
    </Container>
  );
}

export default Imprint;
