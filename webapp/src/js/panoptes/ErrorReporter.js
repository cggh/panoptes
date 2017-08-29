function errorNotify(flux, message, retryFunc, dismiss = 5) {
  console.error(message);
  let note = {
    title: 'Error',
    level: 'error',
    message,
    autoDismiss: dismiss,
  };
  if (retryFunc) {
    note.action = {
      label: 'Retry',
      callback: retryFunc
    };
  }
  flux.actions.session.notify(note);
}

export default errorNotify;
