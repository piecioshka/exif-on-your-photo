// All of the Node.js APIs are available in the preload process.

const exifr = require("exifr");
const fs = require("fs").promises;
const path = require("path");
const { number2fraction } = require("number2fraction");

const IMAGE_QUALITY = 0.5;

const TEXT_COLOR = "#ffffff";
const FONT_SIZE = 48;

const SUPPORTED_FONTS = [
  "Cochin", // Default
  "Baskerville",
  "Didot",
  "Optima",
];

const MAX_THUMB_WIDTH = 200;
const MAX_THUMB_HEIGHT = 200;

const template = (exif) => `
ISO ${exif.ISO}  ${exif.FocalLength}mm  F/${exif.FNumber}  ${number2fraction(
  exif.ExposureTime
)}s
`;

let fontSize = FONT_SIZE;
let fontFamily = SUPPORTED_FONTS[0];
const images = [];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} fileType
 * @param {number} quality
 */
async function canvasToBuffer(canvas, fileType, quality) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), fileType, quality)
  );
  return Buffer.from(await blob.arrayBuffer());
}

async function saveFile(item, file, quality) {
  try {
    await createDirectory(path.dirname(file));
    const buffer = await canvasToBuffer(item.$canvas, item.file.type, quality);
    await fs.writeFile(file, buffer);
  } catch (error) {
    alert(error);
  }
}

async function createDirectory(dirname) {
  try {
    await fs.mkdir(dirname, { recursive: true });
  } catch {}
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
      alert("Cannot find element with index: " + index);
      return;
    }
    $thumbnails.removeChild($thumbnails.childNodes[index]);
    images.splice(index, 1);

    if (images.length === 0) {
      const $dropContainer = document.querySelector("#drop-container");
      $dropContainer.classList.remove("hide");
    }
  });
  $target.append($remove);
}

function createThumbnail($target) {
  const $thumb = document.createElement("div");
  $thumb.classList.add("thumb");
  const $canvas = document.createElement("canvas");
  $thumb.append($canvas);
  createRemoveButton($thumb);
  $target.append($thumb);
  return $canvas;
}

function fillCanvas(canvas, img) {
  const ctx = canvas.getContext("2d");
  canvas.width = img.width;
  canvas.height = img.height;

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
 * @param {string} text
 * @param {number} x
 * @param {number} y
 */
function addText(canvas, text, x, y) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = TEXT_COLOR;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  ctx.shadowBlur = 3;
  ctx.shadowColor = "#000000";
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillText(text, x, y);
}

function setupImageQuality($input) {
  $input.value = IMAGE_QUALITY;
}

function setupFontSize($input) {
  $input.value = FONT_SIZE;

  $input.addEventListener("change", () => {
    fontSize = $input.value;
    reloadPhotos();
  });
}

function setupFontFamilies($select) {
  const fragment = document.createDocumentFragment();

  SUPPORTED_FONTS.forEach((font) => {
    const $option = document.createElement("option");
    $option.textContent = font;
    $option.setAttribute("value", font);
    fragment.append($option);
  });

  $select.append(fragment);

  $select.addEventListener("change", () => {
    fontFamily = $select.value;
    reloadPhotos();
  });
}

function createPhotoWithText($canvas, img, text) {
  fillCanvas($canvas, img);
  addText($canvas, text, 40, img.height - 40);
}

function reloadPhotos() {
  const $canvasFarm = document.querySelector("#canvas-farm");
  removeAllElements($canvasFarm);

  images.forEach((item, index) => {
    const $canvas = createThumbnail($canvasFarm, index);
    item.$canvas = $canvas;
    createPhotoWithText(item.$canvas, item.img, item.text);
  });
}

function main() {
  const $input = document.querySelector("#input-label");
  const $canvasFarm = document.querySelector("#canvas-farm");
  const $dropContainer = document.querySelector("#drop-container");
  const $resetButton = document.querySelector("#reset-button");
  const $saveButton = document.querySelector("#save-button");
  const $quality = document.querySelector("#quality-input");
  const $fontFamily = document.querySelector("#font-family");
  const $fontSize = document.querySelector("#font-size-input");

  setupImageQuality($quality);
  setupFontSize($fontSize);
  setupFontFamilies($fontFamily);

  $resetButton.addEventListener("click", () => {
    location.reload();
  });

  $dropContainer.addEventListener("click", () => {
    $input.dispatchEvent(new MouseEvent("click"));
  });

  $input.addEventListener("change", async (evt) => {
    $dropContainer.classList.add("hide");

    const files = evt.target.files;

    for (const file of files) {
      const tags = await exifr.parse(file);
      const text = template(tags);
      const img = await loadImage(file.path);
      const $canvas = createThumbnail($canvasFarm);

      images.push({ file, text, img, $canvas });

      createPhotoWithText($canvas, img, text);
    }
  });

  $saveButton.addEventListener("click", () => {
    if (images.length === 0) {
      alert("Please select photos");
      return;
    }

    images.forEach((item) => {
      const dirname = path.dirname(item.file.path);
      const directory = path.join(dirname, "WITH_EXIF");
      const quality = Number($quality.value);
      return saveFile(item, `${directory}/${item.file.name}`, quality);
    });
  });
}

window.addEventListener("DOMContentLoaded", main);
