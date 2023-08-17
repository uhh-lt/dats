import ReactDOM from "react-dom";
import EventTimeline from "./Timeline";

class TimelineTool {
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = {
      events: data.events || [],
    };

    this.CSS = {
      wrapper: "walkthrough-timeline",
    };

    this.nodes = {
      holder: null,
    };
  }

  // BEGIN Framework methods

  static get isInline() {
    return false;
  }

  static get isReadOnlySupported() {
    return true;
  }

  // name and icon of the block tool
  static get toolbox() {
    return {
      icon: '<svg><path d="M23 8c0 1.1-.9 2-2 2-.18 0-.35-.02-.51-.07l-3.56 3.55c.05.16.07.34.07.52 0 1.1-.9 2-2 2s-2-.9-2-2c0-.18.02-.36.07-.52l-2.55-2.55c-.16.05-.34.07-.52.07s-.36-.02-.52-.07l-4.55 4.56c.05.16.07.33.07.51 0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.51.07l4.56-4.55C8.02 9.36 8 9.18 8 9c0-1.1.9-2 2-2s2 .9 2 2c0 .18-.02.36-.07.52l2.55 2.55c.16-.05.34-.07.52-.07s.36.02.52.07l3.55-3.56C19.02 8.35 19 8.18 19 8c0-1.1.9-2 2-2s2 .9 2 2z"></path></svg>',
      title: "Timeline",
    };
  }

  render() {
    const rootNode = document.createElement("div");
    rootNode.setAttribute("class", this.CSS.wrapper);
    this.nodes.holder = rootNode;

    const onDataChange = (newData) => {
      this.data = {
        ...newData,
      };
    };

    ReactDOM.render(<EventTimeline onDataChange={onDataChange} readOnly={this.readOnly} data={this.data} />, rootNode);

    return this.nodes.holder;
  }

  save() {
    return this.data;
  }

  // END Framework methods
}

export default TimelineTool;
