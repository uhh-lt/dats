const eventBus = {
  on(event: string, listener: (e: CustomEventInit) => void) {
    document.addEventListener(event, listener);
  },
  dispatch(event: string, data: any) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(event: string, listener: (e: CustomEventInit) => void) {
    document.removeEventListener(event, listener);
  },
};

export default eventBus;
