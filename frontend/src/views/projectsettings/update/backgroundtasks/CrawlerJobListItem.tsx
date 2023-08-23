import {
  Link,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import React from "react";
import CrawlerHooks from "../../../../api/CrawlerHooks";
import { CrawlerJobRead } from "../../../../api/openapi";
import BackgroundJobListItem from "./BackgroundJobListItem";

interface CrawlerJobListItemProps {
  initialCrawlerJob: CrawlerJobRead;
}

function CrawlerJobListItem({ initialCrawlerJob }: CrawlerJobListItemProps) {
  // global server state (react-query)
  const crawlerJob = CrawlerHooks.usePollCrawlerJob(initialCrawlerJob.id, initialCrawlerJob);

  const date = new Date(initialCrawlerJob.created);

  if (crawlerJob.isSuccess) {
    return (
      <BackgroundJobListItem jobStatus={crawlerJob.data.status} title={`Crawler Job: ${crawlerJob.data.id}`} subTitle={`${date.toLocaleTimeString()}, ${date.toDateString()}`}>
        <List component="div" disablePadding dense sx={{ maxHeight: 180, overflowY: "auto" }}>
          {crawlerJob.data.parameters.urls.map((url, index) => (
            <ListItemButton key={index} component={Link} href={url} target="_blank">
              <ListItemIcon></ListItemIcon>
              <ListItemText primary={url} />
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
