function errorNotify(flux, message, retryFunc) {
  let note = {
    title: "Error",
    level: 'error',
    message: message,
    autoDismiss: 0,
    action: {
      label: 'Retry',
      callback: retryFunc
    }
  };
  if (retryFunc) {
    note.action = {
      label: 'Retry',
      callback: retryFunc
    }
  }
  flux.actions.layout.notify(note);
}

module.exports = errorNotify;