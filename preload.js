// The renderer runs sandboxed, so every Node.js API it needs has to be
// exposed here explicitly. A sandboxed preload may only require "electron",
// "events", "timers" and "url" - anything else kills the whole script.

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("photoApi", {
  /**
   * @param {File} file
   * @returns {Promise<{ focalLength: number | null, fNumber: number | null, exposureTime: string | null, iso: number | null } | null>}
   */
  readExif: (file) =>
    ipcRenderer.invoke("exif:read", webUtils.getPathForFile(file)),

  /**
   * Writes the file next to the original one, inside a WITH_EXIF directory.
   *
   * @param {File} file
   * @param {Uint8Array} data
   * @returns {Promise<string>} path of the saved file
   */
  savePhoto: (file, data) =>
    ipcRenderer.invoke("photo:save", {
      filePath: webUtils.getPathForFile(file),
      fileName: file.name,
      data,
    }),

  /**
   * Opens the saved file in Finder, so "where did it go?" is one click away.
   *
   * @param {string} target path returned by savePhoto
   * @returns {Promise<void>}
   */
  revealPhoto: (target) => ipcRenderer.invoke("photo:reveal", target),
});
