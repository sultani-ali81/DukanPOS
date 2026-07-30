function acquireSingleInstanceLock({ app, getMainWindow }) {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return false;
  }

  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return;

    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  return true;
}

module.exports = {
  acquireSingleInstanceLock,
};
