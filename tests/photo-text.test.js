import { describe, expect, it } from "vitest";

import {
  caption,
  countPhotos,
  describeError,
  directoryOf,
  formatExposureTime,
  qualityFromPercent,
} from "../lib/photo-text.js";

describe("formatExposureTime", () => {
  it("turns a fraction of a second back into a shutter speed", () => {
    expect(formatExposureTime(1 / 60)).toBe("1/60");
    expect(formatExposureTime(0.004)).toBe("1/250");
  });

  it("keeps long exposures as seconds", () => {
    expect(formatExposureTime(1)).toBe("1");
    expect(formatExposureTime(2.5)).toBe("2.5");
  });

  it("rejects anything that is not a positive number", () => {
    expect(formatExposureTime(0)).toBeNull();
    expect(formatExposureTime(-1)).toBeNull();
    expect(formatExposureTime(Number.NaN)).toBeNull();
    expect(formatExposureTime(Number.POSITIVE_INFINITY)).toBeNull();
    expect(formatExposureTime("1/60")).toBeNull();
    expect(formatExposureTime(undefined)).toBeNull();
  });
});

describe("caption", () => {
  it("joins every setting the file carries", () => {
    expect(
      caption({
        focalLength: 35,
        fNumber: 1.8,
        exposureTime: "1/60",
        iso: 400,
      }),
    ).toBe("35mm  F/1.8  1/60s  ISO400");
  });

  it("rounds the values a real camera stores", () => {
    // EXIF keeps these as rationals, so an iPhone reports 2.22mm as
    // 2.220000028611935 and f/1.8 as 1.7799999713880652.
    expect(
      caption({
        focalLength: 2.220000028611935,
        fNumber: 1.7799999713880652,
        exposureTime: "1/5155",
        iso: 50,
      }),
    ).toBe("2.2mm  F/1.8  1/5155s  ISO50");
  });

  it("drops a trailing zero from a round focal length", () => {
    expect(
      caption({
        focalLength: 24.000000001,
        fNumber: 11,
        exposureTime: "8",
        iso: 100,
      }),
    ).toBe("24mm  F/11  8s  ISO100");
  });

  it("leaves out the tags the file does not have", () => {
    expect(
      caption({
        focalLength: null,
        fNumber: 2.8,
        exposureTime: null,
        iso: 100,
      }),
    ).toBe("F/2.8  ISO100");
  });

  it("returns an empty line when nothing is known", () => {
    expect(
      caption({
        focalLength: null,
        fNumber: null,
        exposureTime: null,
        iso: null,
      }),
    ).toBe("");
  });
});

describe("describeError", () => {
  it("strips the IPC wrapper", () => {
    expect(
      describeError(
        new Error(
          "Error invoking remote method 'photo:save': Error: EACCES: permission denied",
        ),
      ),
    ).toBe("EACCES: permission denied");
  });

  it("copes with a thrown value that is not an Error", () => {
    expect(describeError("disk full")).toBe("disk full");
  });
});

describe("directoryOf", () => {
  it("drops the file name", () => {
    expect(directoryOf("/photos/trip/WITH_EXIF/DSC_0001.jpg")).toBe(
      "/photos/trip/WITH_EXIF",
    );
  });

  it("understands backslashes too", () => {
    expect(directoryOf("C:\\photos\\DSC_0001.jpg")).toBe("C:\\photos");
  });
});

describe("countPhotos", () => {
  it("keeps the noun in agreement", () => {
    expect(countPhotos(1)).toBe("1 photo");
    expect(countPhotos(0)).toBe("0 photos");
    expect(countPhotos(12)).toBe("12 photos");
  });
});

describe("qualityFromPercent", () => {
  it("turns percent into the 0-1 canvas.toBlob() wants", () => {
    expect(qualityFromPercent("80", 50)).toBe(0.8);
  });

  it("caps at 100 percent", () => {
    expect(qualityFromPercent("400", 50)).toBe(1);
  });

  it("falls back when the field holds nothing usable", () => {
    expect(qualityFromPercent("", 50)).toBe(0.5);
    expect(qualityFromPercent("abc", 50)).toBe(0.5);
    expect(qualityFromPercent("-10", 50)).toBe(0.5);
  });
});
