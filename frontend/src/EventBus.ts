export const eventBus = {
  on(event: string, listener: (e: CustomEventInit) => void) {
    document.addEventListener(event, listener);
  },
  dispatch(event: string, data: unknown) {
    document.dispatchEvent(new CustomEvent(event, { detail: data }));
  },
  remove(event: string, listener: (e: CustomEventInit) => void) {
    document.removeEventListener(event, listener);
  },
};
