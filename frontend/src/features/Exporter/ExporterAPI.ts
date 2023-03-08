import eventBus from "../../EventBus";

export interface ExporterEvent {
  test: number;
}

function openExporterDialog(props: ExporterEvent) {
  eventBus.dispatch("open-exporter", props);
}

const ExporterAPI = { openExporterDialog };

export default ExporterAPI;
