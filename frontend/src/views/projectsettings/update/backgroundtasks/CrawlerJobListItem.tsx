import {
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Typography
} from "@mui/material";
import React from "react";
import CrawlerHooks from "../../../../api/CrawlerHooks";
import { CrawlerJobRead } from "../../../../api/openapi";
import BackgroundJobListItem from "./BackgroundJobListItem";
import WebIcon from '@mui/icons-material/Web';

interface CrawlerJobListItemProps {
  initialCrawlerJob: CrawlerJobRead;
}

function CrawlerJobListItem({ initialCrawlerJob }: CrawlerJobListItemProps) {
  // global server state (react-query)
  const crawlerJob = CrawlerHooks.usePollCrawlerJob(initialCrawlerJob.id, initialCrawlerJob);

  const date = new Date(initialCrawlerJob.created);

  if (crawlerJob.isSuccess) {
    return (
      <BackgroundJobListItem jobStatus={crawlerJob.data.status} jobId={crawlerJob.data.id} title={`Crawler Job: ${crawlerJob.data.id}`} subTitle={`${date.toLocaleTimeString()}, ${date.toDateString()}`}>
        <List
          component="div"
          disablePadding
          dense
          sx={{ pl: 6 }}
          subheader={
            <ListSubheader>
              Downloaded URLs
            </ListSubheader>
          }
        >
          {crawlerJob.data.parameters.urls.map((url, index) => (
            <ListItemButton key={index} component={Link} href={url} target="_blank">
              <ListItemIcon>
                <WebIcon />
              </ListItemIcon>
              <ListItemText>
                  <Typography variant="body2" color="text.secondary">
                    {url}
                  </Typography>
              </ListItemText>
            </ListItemButton>
          ))}
        </List>
      </BackgroundJobListItem>
    );
  } else {
    return null;
  }
}

export default CrawlerJobListItem;
