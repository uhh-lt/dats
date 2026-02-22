import { Grid2, Link, Typography } from "@mui/material";
import { SUPPORT_EMAIL } from "../../../utils/GlobalConstants.ts";

export function DataPrivacy() {
  return (
    <>
      <Typography variant={"h5"} gutterBottom sx={{ pb: 1 }}>
        Data and Privacy
      </Typography>

      <Grid2 container spacing={1} sx={{ borderTop: 1, borderColor: "divider" }}>
        <Grid2 size={{ xs: 12 }} sx={{ mt: 1, height: "100%", overflow: "auto" }}>
          <Typography variant={"body1"} gutterBottom>
            This section outlines how we collect, use, and protect your data.
            <br />
            <br />
            <strong>Data Collection</strong>
            <br />
            We collect the following types of data from our users:
          </Typography>

          <Typography variant={"body1"} gutterBottom>
            Personal information: This includes your name, email address, and other information such as bio, pronouns
            and feedback that you provide to us.
          </Typography>

          <Typography variant={"body1"} gutterBottom>
            <strong>Data Sharing</strong>
            <br />
            We do not share your data with third-party services or partners, except as required by law or as necessary
            to provide you with the services you have requested.
            <br />
            <br />
            <strong>Data Security</strong>
            <br />
            We use industry-standard security measures to protect your data from unauthorized access or disclosure. This
            includes encryption, access controls, and monitoring.
            <br />
            <br />
            <strong>Data Retention</strong>
            <br />
            We retain your data for as long as necessary to provide you with the services you have requested and to
            comply with legal obligations. We delete or anonymize your data when it is no longer needed.
            <br />
            <br />
            <strong>User Rights</strong>
            <br />
            You have the following rights with respect to your data:
          </Typography>
          <ul>
            <li>
              <Typography variant={"body1"} gutterBottom>
                Right to access: You have the right to access the data we have collected about you.
              </Typography>
            </li>
            <li>
              <Typography variant={"body1"} gutterBottom>
                Right to correct: You have the right to correct any inaccurate or incomplete data we have collected
                about you.
              </Typography>
            </li>
            <li>
              <Typography variant={"body1"} gutterBottom>
                Right to delete: You have the right to request that we delete your data.
              </Typography>
            </li>
            <li>
              <Typography variant={"body1"} gutterBottom>
                Right to object: You have the right to object to the processing of your data.
              </Typography>
            </li>
          </ul>
          <Typography variant={"body1"} gutterBottom>
            To exercise these rights, please contact us at <Link href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</Link>
            .
          </Typography>
        </Grid2>
      </Grid2>
    </>
  );
}
