import { Icon } from "@components/icons";
import { Feature } from "@models/Feature";
import type { RegisteredRouter } from "@tanstack/react-router";

/** Where an entry appears: the sidebar search menu, the sidebar, the analysis dashboard or the sidebar tools menu. */
export type FeatureGroup = "search" | "main" | "analysis" | "tools";

export type FeatureCommandCategory = "Navigation" | "Analysis" | "Tools";

export type FeatureRoute = Extract<
  RegisteredRouter["routeTree"]["types"]["fileRouteTypes"]["to"],
  `/project/$projectId/${string}`
>;

/**
 * A navigation shortcut: a single key pressed with ⌘⇧ (`"s"`), or a two-step chord: the ⌘⇧ shortcut `after`
 * (which keeps its own action), then the plain `key` within a moment.
 */
export type FeatureShortcut = string | { after: string; key: string };

export interface FeatureEntry {
  /** Stable id of the navigation entry. */
  id: string;
  /** The toggleable backend feature that gates this entry; entries without one need core data only and are always available. */
  feature?: Feature;
  group: FeatureGroup;
  title: string;
  /** Shown on the analysis dashboard card. */
  description?: string;
  icon: Icon;
  to: FeatureRoute;
  /** Navigation shortcut; every entry has one. */
  shortcut: FeatureShortcut;
  /** Sidebar tooltip, if it differs from the title. */
  sidebarTooltip?: string;
  /** Quick command menu entry; every entry has one. */
  command: {
    title?: string;
    description: string;
    keywords: readonly string[];
    /** Defaults to the category of the entry's group. */
    category?: FeatureCommandCategory;
  };
}
