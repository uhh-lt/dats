import eventBus from "../../EventBus.ts";
import { ExporterInfo } from "./ExporterDialog.tsx";

function openExporterDialog(props: ExporterInfo) {
  eventBus.dispatch("open-exporter", props);
}

const ExporterAPI = { openExporterDialog };

export default ExporterAPI;
