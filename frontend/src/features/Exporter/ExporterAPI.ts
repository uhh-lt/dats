import eventBus from "../../EventBus";

export interface ExporterConfig {
  test: number;
}

function openExporterDialog(props: ExporterConfig) {
  eventBus.dispatch("open-exporter", props);
}

const ExporterAPI = { openExporterDialog };

export default ExporterAPI;
