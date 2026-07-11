export function createFifteenPartBoundaries(start, end) {
  const startMs = start?.getTime?.();
  const endMs = end?.getTime?.();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw new Error("Invalid boundary date");
  }
  if (endMs <= startMs) {
    throw new Error("Boundary interval end must be after start");
  }
  const duration = endMs - startMs;
  return Array.from({ length: 16 }, (_, index) => new Date(startMs + (duration * index) / 15));
}

export function resolveBoundaryRanges(boundaries, ranges = []) {
  if (!Array.isArray(boundaries) || boundaries.length !== 16) {
    throw new Error("Expected exactly 16 boundaries");
  }
  return ranges.map(({ from, to }) => {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > 15 || from >= to) {
      throw new Error(`Invalid boundary range ${from}-${to}`);
    }
    return {
      start: boundaries[from],
      end: boundaries[to],
      from,
      to
    };
  });
}

export function calculateAmritaMahendra(sunrise, sunset, nextSunrise, template = emptyAmritaMahendraTemplate()) {
  if (!(sunrise < sunset && sunset < nextSunrise)) {
    throw new Error("Expected sunrise < sunset < nextSunrise");
  }
  const dayBoundaries = createFifteenPartBoundaries(sunrise, sunset);
  const nightBoundaries = createFifteenPartBoundaries(sunset, nextSunrise);
  return {
    amritaDay: resolveBoundaryRanges(dayBoundaries, template.amritaDay),
    amritaNight: resolveBoundaryRanges(nightBoundaries, template.amritaNight),
    mahendraDay: resolveBoundaryRanges(dayBoundaries, template.mahendraDay),
    mahendraNight: resolveBoundaryRanges(nightBoundaries, template.mahendraNight),
    dayBoundaries,
    nightBoundaries,
    templateStatus: template.status || "matrix_pending",
    basis: template.basis || null
  };
}

export function emptyAmritaMahendraTemplate() {
  return {
    status: "matrix_pending",
    amritaDay: [],
    amritaNight: [],
    mahendraDay: [],
    mahendraNight: []
  };
}
