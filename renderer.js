// This file is required by the index.html file and will be executed in the
// renderer process for that window. No Node.js APIs are available here -
// everything that touches the disk goes through `window.photoApi`
// (see preload.js).

const LEFT_OFFSET = 120;
const BOTTOM_OFFSET = 40;

// Percent, not a fraction: a decimal input would show the separator of the
// system locale, which is not what the app promises.
const IMAGE_QUALITY = 50;

const TEXT_COLOR = "#ffffff";
const FONT_SIZE = 48;

const SUPPORTED_FONTS = {
  Cochin: "Cochin", // Default
  Baskerville: "Baskerville",
  Didot: "Didot",
  Optima: "Optima",
};

const SUPPORTED_DIMENSIONS = {
  Original: "Original",
  FullHD: "1920x1280",
};

const MAX_THUMB_WIDTH = 200;
const MAX_THUMB_HEIGHT = 200;

// Loaded by index.html before this file (see lib/photo-text.js).
const { caption, countPhotos, describeError, directoryOf, qualityFromPercent } =
  window.photoText;

let fontSize = FONT_SIZE;
let fontFamily = SUPPORTED_FONTS.Cochin;
let dimension = SUPPORTED_DIMENSIONS.Original;
let lastSavedPath = null;
const images = [];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} fileType
 * @param {number} quality
 */
async function canvasToBytes(canvas, fileType, quality) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), fileType, quality),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

async function saveFile(item, quality) {
  const data = await canvasToBytes(item.$canvas, item.file.type, quality);
  return window.photoApi.savePhoto(item.file, data);
}

/**
 * @param {HTMLElement} $status
 * @param {string} message
 * @param {{ isError?: boolean, detail?: string }} [options]
 */
function setStatus($status, message, { isError = false, detail = "" } = {}) {
  $status.textContent = message;
  // The toolbar truncates long messages - keep the whole story on hover.
  $status.title = detail || message;
  $status.classList.toggle("status--error", Boolean(isError));
}

/**
 * @param {HTMLElement} $element
 */
function removeAllElements($element) {
  while ($element.childElementCount) {
    $element.removeChild($element.firstElementChild);
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

/**
 * @param {HTMLElement} $target
 */
function createRemoveButton($target) {
  const $remove = document.createElement("button");
  $remove.classList.add("remove-button");
  $remove.textContent = "🚫";
  $remove.addEventListener("click", () => {
    const $thumbnails = $target.parentElement;
    const index = Array.from($thumbnails.childNodes).indexOf($target);
    if (index < 0) {
      // Only reachable if the thumbnail is detached before the click lands.
      console.error("Cannot find element with index: " + index);
      return;
    }
    $thumbnails.removeChild($thumbnails.childNodes[index]);
    URL.revokeObjectURL(images[index].url);
    images.splice(index, 1);

    if (images.length === 0) {
      const $dropContainer = document.querySelector("#drop-container");
      $dropContainer.classList.remove("hide");
    }
  });
  $target.append($remove);
}

/**
 * @param {HTMLElement} $target
 * @param {string} name file name shown under the preview
 */
function createThumbnail($target, name) {
  const $thumb = document.createElement("div");
  $thumb.classList.add("thumb");
  const $canvas = document.createElement("canvas");
  $thumb.append($canvas);
  const $name = document.createElement("span");
  $name.classList.add("thumb__name");
  $name.textContent = name;
  $name.title = name;
  $thumb.append($name);
  createRemoveButton($thumb);
  $target.append($thumb);
  return $canvas;
}

function isHorizontal(width, height) {
  return width > height;
}

function getDimensions(img) {
  switch (dimension) {
    case SUPPORTED_DIMENSIONS.Original:
      return { width: img.width, height: img.height };
    case SUPPORTED_DIMENSIONS.FullHD:
      if (isHorizontal(img.width, img.height)) {
        return { width: 1920, height: 1280 };
      } else {
        return { width: 1280, height: 1920 };
      }
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} img
 */
function fillCanvas(canvas, img) {
  const ctx = canvas.getContext("2d");
  const { width, height } = getDimensions(img);
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").scale(width / img.width, height / img.height);

  if (img.width > img.height) {
    canvas.style.width = `${MAX_THUMB_WIDTH}px`;
    canvas.style.height = `${(img.height * MAX_THUMB_WIDTH) / img.width}px`;
  } else if (img.width < img.height) {
    canvas.style.height = `${MAX_THUMB_HEIGHT}px`;
    canvas.style.width = `${(img.width * MAX_THUMB_HEIGHT) / img.height}px`;
  } else {
    canvas.style.width = `${MAX_THUMB_WIDTH}px`;
    canvas.style.height = `${MAX_THUMB_HEIGHT}px`;
  }
  ctx.drawImage(img, 0, 0);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement} img
 * @param {string} text
 * @param {number} x
 * @param {number} y
 */
function addText(canvas, img, text, x, y) {
  const ctx = canvas.getContext("2d");
  const scale = isHorizontal(img.width, img.height)
    ? img.width / 1920
    : img.width / 1280;
  ctx.fillStyle = TEXT_COLOR;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 3;
  ctx.shadowColor = "#000000";
  ctx.font = `${fontSize * scale}px ${fontFamily}`;
  ctx.fillText(text, x * scale, img.height - y * scale);
}

function setupImageQuality($input) {
  $input.value = IMAGE_QUALITY;
}

/**
 * @param {HTMLInputElement} $input
 * @returns {number} between 0 and 1
 */
function readQuality($input) {
  return qualityFromPercent($input.value, IMAGE_QUALITY);
}

function setupFontSize($input) {
  $input.value = FONT_SIZE;

  $input.addEventListener("change", () => {
    fontSize = $input.value;
    reloadPhotos();
  });
}

function setupSelect($select, dict, cb) {
  const fragment = document.createDocumentFragment();

  Object.keys(dict).forEach((key) => {
    const value = dict[key];
    const $option = document.createElement("option");
    $option.textContent = value;
    $option.setAttribute("value", value);
    fragment.append($option);
  });

  $select.append(fragment);

  $select.addEventListener("change", () => {
    cb($select.value);
    reloadPhotos();
  });
}

function createPhotoWithText($canvas, img, text) {
  fillCanvas($canvas, img);
  addText($canvas, img, text, LEFT_OFFSET, BOTTOM_OFFSET);
}

function reloadPhotos() {
  const $canvasFarm = document.querySelector("#canvas-farm");
  removeAllElements($canvasFarm);

  images.forEach((item) => {
    const $canvas = createThumbnail($canvasFarm, item.file.name);
    item.$canvas = $canvas;
    createPhotoWithText(item.$canvas, item.img, item.text);
  });
}

/**
 * Shows which build is running - the first thing worth knowing in a bug report.
 *
 * @param {HTMLElement} $version
 */
function setupVersion($version) {
  const version = window.photoApi.version;
  if (!version) {
    return;
  }
  $version.textContent = `v${version}`;
  $version.title = `EXIF on your photo ${version}`;
}

function main() {
  const $input = document.querySelector("#input-label");
  const $canvasFarm = document.querySelector("#canvas-farm");
  const $dropContainer = document.querySelector("#drop-container");
  const $resetButton = document.querySelector("#reset-button");
  const $saveButton = document.querySelector("#save-button");
  const $saveStatus = document.querySelector("#save-status");
  const $revealButton = document.querySelector("#reveal-button");
  const $quality = document.querySelector("#quality-input");
  const $fontFamily = document.querySelector("#font-family-select");
  const $fontSize = document.querySelector("#font-size-input");
  const $dimensions = document.querySelector("#dimensions-select");
  const $version = document.querySelector("#app-version");

  setupVersion($version);
  setupImageQuality($quality);
  setupFontSize($fontSize);
  setupSelect($fontFamily, SUPPORTED_FONTS, (selectedValue) => {
    fontFamily = selectedValue;
  });
  setupSelect($dimensions, SUPPORTED_DIMENSIONS, (selectedValue) => {
    dimension = selectedValue;
  });

  $resetButton.addEventListener("click", () => {
    location.reload();
  });

  // The dropzone is a <button>, so Enter and Space open the picker too.
  $dropContainer.addEventListener("click", () => {
    $input.click();
  });

  $input.addEventListener("change", async (evt) => {
    $dropContainer.classList.add("hide");
    setStatus($saveStatus, "");
    $revealButton.classList.add("hide");

    const files = evt.target.files;
    const rejected = [];

    for (const file of files) {
      try {
        const exif = await window.photoApi.readExif(file);
        const text = exif === null ? "" : caption(exif);
        const url = URL.createObjectURL(file);
        const img = await loadImage(url);
        const $canvas = createThumbnail($canvasFarm, file.name);

        images.push({ file, text, img, url, $canvas });

        createPhotoWithText($canvas, img, text);
      } catch (error) {
        // One broken file must not stop the rest of the batch, and a modal per
        // file would mean dozens of clicks - the status bar says it once.
        rejected.push(`${file.name} (${describeError(error)})`);
      }
    }

    if (rejected.length > 0) {
      setStatus(
        $saveStatus,
        `Could not read ${countPhotos(rejected.length)}: ${rejected[0]}`,
        { isError: true, detail: rejected.join(", ") },
      );
    }

    if (images.length === 0) {
      $dropContainer.classList.remove("hide");
    }
  });

  $revealButton.addEventListener("click", () => {
    if (lastSavedPath !== null) {
      window.photoApi.revealPhoto(lastSavedPath);
    }
  });

  $saveButton.addEventListener("click", async () => {
    if (images.length === 0) {
      setStatus($saveStatus, "Add photos first", { isError: true });
      return;
    }

    const quality = readQuality($quality);

    $saveButton.disabled = true;
    $revealButton.classList.add("hide");
    setStatus($saveStatus, `Saving ${countPhotos(images.length)}\u2026`);

    const results = await Promise.allSettled(
      images.map((item) => saveFile(item, quality)),
    );

    $saveButton.disabled = false;

    const saved = results.filter((result) => result.status === "fulfilled");
    const failed = results.filter((result) => result.status === "rejected");

    if (saved.length > 0) {
      lastSavedPath = saved[0].value;
      $revealButton.classList.remove("hide");
    }

    if (failed.length === 0) {
      setStatus($saveStatus, `Saved ${countPhotos(saved.length)}`, {
        detail: `Saved to ${directoryOf(lastSavedPath)}`,
      });
    } else if (saved.length === 0) {
      setStatus(
        $saveStatus,
        `Nothing saved: ${describeError(failed[0].reason)}`,
        {
          isError: true,
        },
      );
    } else {
      setStatus(
        $saveStatus,
        `Saved ${countPhotos(saved.length)}, ${countPhotos(failed.length)} failed: ${describeError(failed[0].reason)}`,
        { isError: true },
      );
    }
  });
}

window.addEventListener("DOMContentLoaded", main);
