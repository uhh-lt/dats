class MarkerTool {
  constructor({ api }) {
    this.api = api;
    this.button = null;
    this._state = false;

    this.tag = "MARK";
    this.class = "cdx-marker";
    this.element = null;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;

    this.button.classList.toggle(this.api.styles.inlineToolButtonActive, state);
  }

  // BEGIN Framewok methods

  // this tool is an inline tool
  static get isInline() {
    return true;
  }

  // https://editorjs.io/inline-tool-sanitizing/
  static get sanitize() {
    return {
      mark: {
        class: "cdx-marker",
        style: true,
      },
    };
  }

  // Render method must return HTML element of the button for Inline Toolbar.
  render() {
    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.textContent = "M";

    // Styles API provides some CSS classes to stylize elements of our Tool with common Editor.js style
    this.button.classList.add(this.api.styles.inlineToolButton);

    return this.button;
  }

  // when button is pressed, the Editor calls surround method of the tool with Range object as an argument
  surround(range) {
    // If highlights is already applied, remove the highlighting
    if (this.state) {
      this.unwrap(range);
      return;
    }

    this.wrap(range);
  }

  // When user selects some text, the Editor calls checkState method of each Inline Tool with current Selection to update the state if selected text contains some of the inline markup.
  // is the inline tool applied? If yes, then the button will be highlighted
  checkState(selection) {
    const mark = this.api.selection.findParentTag(this.tag);

    this.state = !!mark;

    if (this.state) {
      this.showActions(mark);
    } else {
      this.hideActions();
    }
  }

  renderActions() {
    this.colorPicker = document.createElement("input");
    this.colorPicker.type = "color";
    this.colorPicker.value = "#f5f1cc";
    this.colorPicker.hidden = true;

    return this.colorPicker;
  }

  showActions(mark) {
    const { backgroundColor } = mark.style;

    this.colorPicker.value = backgroundColor ? this.convertToHex(backgroundColor) : "#f5f1cc";

    this.colorPicker.onchange = () => {
      mark.style.backgroundColor = this.colorPicker.value;
    };
    this.colorPicker.hidden = false;
  }

  hideActions() {
    this.colorPicker.onchange = null;
    this.colorPicker.hidden = true;
  }

  // END Framewok methods

  wrap(range) {
    const selectedText = range.extractContents();
    const mark = document.createElement(this.tag);

    mark.classList.add(this.class);
    mark.appendChild(selectedText);
    range.insertNode(mark);

    this.api.selection.expandToTag(mark);

    this.element = mark;
  }

  unwrap(range) {
    const mark = this.api.selection.findParentTag(this.tag, this.class);
    const text = range.extractContents();

    mark.remove();

    range.insertNode(text);

    this.element = null;
  }

  convertToHex(color) {
    const rgb = color.match(/(\d+)/g);

    let hexr = parseInt(rgb[0]).toString(16);
    let hexg = parseInt(rgb[1]).toString(16);
    let hexb = parseInt(rgb[2]).toString(16);

    hexr = hexr.length === 1 ? "0" + hexr : hexr;
    hexg = hexg.length === 1 ? "0" + hexg : hexg;
    hexb = hexb.length === 1 ? "0" + hexb : hexb;

    return "#" + hexr + hexg + hexb;
  }
}

export default MarkerTool;
