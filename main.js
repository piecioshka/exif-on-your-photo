// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const exifr = require("exifr");
const { formatExposureTime } = require("./lib/photo-text.js");

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    // The toolbar carries two buttons, the save status and four settings.
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Read once at startup so the renderer can show the version without
      // waiting on an async round trip.
      additionalArguments: [`--app-version=${app.getVersion()}`],
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  //   mainWindow.webContents.openDevTools();
}

ipcMain.handle("exif:read", async (_event, filePath) => {
  const tags = await exifr.parse(filePath);
  if (!tags) {
    return null;
  }
  return {
    focalLength: tags.FocalLength ?? null,
    fNumber: tags.FNumber ?? null,
    exposureTime: formatExposureTime(tags.ExposureTime),
    iso: tags.ISO ?? null,
  };
});

ipcMain.handle("photo:save", async (_event, { filePath, fileName, data }) => {
  const directory = path.join(path.dirname(filePath), "WITH_EXIF");
  await fs.mkdir(directory, { recursive: true });
  // The name comes from the renderer, so it stays a name: a path in there
  // would land the file outside WITH_EXIF.
  const target = path.join(directory, path.basename(fileName));
  await fs.writeFile(target, Buffer.from(data));
  return target;
});

ipcMain.handle("photo:reveal", (_event, target) => {
  shell.showItemInFolder(target);
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
