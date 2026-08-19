// Pure helpers shared by the main and the renderer process. No DOM, no
// Node.js APIs - so they run under Vitest as they are.
//
// The renderer loads this file with a plain <script> tag (ES modules over
// file:// are blocked by CORS in Chromium), hence the two ways out below.

(function (globalScope) {
  /**
   * EXIF stores the exposure time as a rational (e.g. 1/60), but it reaches us
   * already divided, so 1/60 arrives as 0.016666666666666666.
   *
   * @param {unknown} seconds
   * @returns {string | null}
   */
  function formatExposureTime(seconds) {
    if (
      typeof seconds !== "number" ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return null;
    }
    if (seconds >= 1) {
      return String(Number(seconds.toFixed(1)));
    }
    return `1/${Math.round(1 / seconds)}`;
  }

  /**
   * EXIF stores focal lengths and apertures as rationals, so a phone reports
   * 2.22mm as 2.220000028611935 - printing that raw fills the caption with
   * digits nobody asked for.
   *
   * @param {unknown} value
   * @returns {string | null}
   */
  function formatDecimal(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return String(Number(value.toFixed(1)));
  }

  /**
   * The line burned onto the photo. Missing tags are simply left out.
   *
   * @param {{ focalLength: number | null, fNumber: number | null, exposureTime: string | null, iso: number | null }} exif
   * @returns {string}
   */
  function caption(exif) {
    const focalLength = formatDecimal(exif.focalLength);
    const fNumber = formatDecimal(exif.fNumber);
    return [
      focalLength !== null ? `${focalLength}mm` : null,
      fNumber !== null ? `F/${fNumber}` : null,
      exif.exposureTime !== null ? `${exif.exposureTime}s` : null,
      exif.iso !== null ? `ISO${exif.iso}` : null,
    ]
      .filter(Boolean)
      .join("  ");
  }

  /**
   * IPC errors arrive wrapped in "Error invoking remote method '...': " - the
   * status bar only has room for what actually went wrong.
   *
   * @param {unknown} reason
   * @returns {string}
   */
  function describeError(reason) {
    const message = String(reason && reason.message ? reason.message : reason);
    return message
      .replace(/^Error invoking remote method '[^']*':\s*/, "")
      .replace(/^Error:\s*/, "");
  }

  /**
   * @param {string} filePath
   * @returns {string} directory holding the file
   */
  function directoryOf(filePath) {
    return filePath.replace(/[\\/][^\\/]*$/, "");
  }

  /**
   * @param {number} count
   * @returns {string}
   */
  function countPhotos(count) {
    return `${count} ${count === 1 ? "photo" : "photos"}`;
  }

  /**
   * The quality field holds percent, canvas.toBlob() wants 0-1.
   *
   * @param {unknown} value value typed into the field
   * @param {number} fallbackPercent used when the field holds nothing usable
   * @returns {number} between 0 and 1
   */
  function qualityFromPercent(value, fallbackPercent) {
    const percent = Number(value);
    if (!Number.isFinite(percent) || percent <= 0) {
      return fallbackPercent / 100;
    }
    return Math.min(percent, 100) / 100;
  }

  const api = {
    formatExposureTime,
    caption,
    describeError,
    directoryOf,
    countPhotos,
    qualityFromPercent,
  };

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    globalScope.photoText = api;
  }
})(typeof globalThis === "undefined" ? this : globalThis);
