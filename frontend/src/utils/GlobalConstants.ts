import { AttachedObjectType } from "../api/openapi/models/AttachedObjectType.ts";

export const SUPPORT_EMAIL = "tim.fischer@uni-hamburg.de";
export const EMAIL_REGEX = /^[A-Za-z0-9][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
export const HELP_MESSAGE_SUFFIX = "To learn more about this page, please click on the help icon.";
export const USER_GUIDE_BASE_URL = "https://github.com/uhh-lt/dats/wiki/User-Guide#";
export const USER_GUIDE_ROUTE_MAP = {
  projects: {
    route: "project-overview",
    description: "This page provides provides an overview of all your projects and recently annotated documents",
  },
  search: { route: "search", description: "This page provides tools for searching and filtering documents" },
  annotation: { route: "annotation", description: "This page provides tools to annotate documents" },
  analysis: { route: "analysis", description: "This page provides tools for analysis" },
  frequency: {
    route: "frequency-analysis",
    description: "This page presents frequency of all codes in this project as a graph",
  },
  timeline: { route: "timeline-analysis", description: "This page presents occurrence of concepts over time" },
  table: { route: "table", description: "This page provides tools to work with tabular views" },
  whiteboard: {
    route: "whiteboard",
    description: "This page provides tools to create and manage empty, code, and image whiteboards",
  },
  logbook: { route: "logbook", description: "This page provides tools to create, edit and manage your logs" },
  autologbook: { route: "autologbook", description: "This page automatically generates logs based on user activity" },
  user: { route: "user-profile", description: "This page provides tools to manage and view your profile" },
  feedback: { route: "feedback", description: "This page displays all feedbacks submitted by the user" },
  about: {
    route: "project-description",
    description: "This page provides details about the Discourse Analysis project and toolsuite",
  },
  export: { route: "export", description: "This page provides tools for exporting your project and more" },
  settings: { route: "settings", description: "This page provides tools for modifying your project settings" },
};
export const UNUSED_MEMO_TYPES = [AttachedObjectType.PROJECT, AttachedObjectType.SPAN_GROUP];
