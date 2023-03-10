import eventBus from "../../EventBus";
import { ExporterInfo } from "./ExporterDialog";

function openExporterDialog(props: ExporterInfo) {
  eventBus.dispatch("open-exporter", props);
}

const ExporterAPI = { openExporterDialog };

export default ExporterAPI;
