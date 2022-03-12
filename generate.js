/**
 * This file converts a color-cycled image from http://effectgames.com/demos/canvascycle/
 * to a Desmos graph state.
 *
 * For some more information about color cycling, see
 * http://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html.
 *
 * The Javascript format is based on the original ILBM
 * (https://en.wikipedia.org/wiki/ILBM) image format.
 *
 * Example:
 * {
 *   filename: "V08AM.LBM",
 *   width: 640,
 *   height: 480,
 *   // colors RGB /255
 *   colors: [[0,0,0],[155,223,255],[127,207,251],[103,191,251],...],
 *   // cycles seems to be based on CRNG: Colour range
 *   cycles: [
 *     ...,
 *     // no effect
 *     {reverse:0,rate:0,low:0,high:0},
 *     // no effect
 *     {reverse:0,rate:0,low:167,high:174},
 *     // 16384 → 60fps, so 1536 → 5.625 fps
 *     // cycle the palette from indices 135 to 143, inclusive
 *     {reverse:0,rate:1536,low:135,high:143},
 *     // 16384 → 60fps, so 1380 → 5.0537 fps
 *     // cycle the palette from indices 127 to 134, inclusive
 *     {reverse:0,rate:1380,low:127,high:134},
 *     ...
 *   ],
 *   // row-major order of 0-based indices into the colors array
 *   pixels: [111,107,108,107,107,108,107,106,105,107,...]
 * }
 */

/*
Paste using:

setTimeout(async () => {
  const stateString = await navigator.clipboard.readText();
  Calc.setState(JSON.parse(stateString));
}, 1000);
*/

const fs = require("fs");

const MAX_VERTICES = 2000;

function i_to_xy(i, width) {
  return { x: i % width, y: Math.floor(i / width) };
}

function xy_to_i(xy, width) {
  return xy.x + xy.y * width;
}

function add_xy(xy1, xy2) {
  return { x: xy1.x + xy2.x, y: xy1.y + xy2.y };
}

function XY(x, y) {
  return { x, y };
}

function flip(i, width, height) {
  return (i % width) + (height - Math.floor(i / width)) * width;
}

/**
 * Assume pixels is a 1D array in row-major order, representing a 2D array of
 * the given width.
 *
 * Return a 256-list of lists of polygons. The polygons are disjoint, and their
 * union is the full image. Each polygons is represented by a list of numbers,
 * where (number%(width+1), number//(width+1)) is the corresponding vertex
 * coordinate.
 *
 * Adding one is required to properly handle vertices on the right edge
 */
function getPolygons(pixels, width, height) {
  const polygonsByColor = Array.from({ length: 256 }).map((_) => []);
  const reached = {};
  for (let i = 0; i < pixels.length; i++) {
    if (reached[i]) {
      continue;
    }
    // for now, be lazy and make each polygon just a 1-pixel high rectangle
    let j = i;
    while (
      Math.floor(j / width) === Math.floor(i / width) &&
      pixels[j] == pixels[i]
    ) {
      reached[j] = true;
      j++;
    }
    // Now, create a rectangle from i to j
    const start = i_to_xy(i, width);
    const end = add_xy(i_to_xy(j - 1, width), XY(1, 0));
    polygonsByColor[pixels[i]].push(
      [start, add_xy(start, XY(0, 1)), add_xy(end, XY(0, 1)), end].map((xy) =>
        flip(xy_to_i(xy, width + 1), width + 1, height)
      )
    );
  }
  // Join up polygons of the same pixel color, up to MAX_VERTICES elements
  const out = Array.from({ length: 256 }).map((_) => []);
  polygonsByColor.forEach((polygonList, i) => {
    let currList = [];
    for (let polygon of polygonList) {
      if (polygon.length + 2 >= MAX_VERTICES) {
        throw `Polygon longer than ${MAX_VERTICES} vertices`;
      }
      if (polygon.length + currList.length + 2 >= MAX_VERTICES) {
        out[i].push(currList);
        currList = [];
      }
      // join up with the first vertex, then add an undefined point
      currList.push(...polygon, polygon[0], "u");
    }
    if (currList.length > 0) {
      out[i].push(currList);
    }
  });
  return out;
}

function pointToLatex(x, y) {
  return `\\left(${x},${y}\\right)`;
}

function opnameCallToLatex(name, ...args) {
  return `\\operatorname{${name}}\\left(${args.join(",")}\\right)`;
}

function polygonToLatex(polygon, width) {
  return opnameCallToLatex(
    "polygon",
    brackets(
      pointToLatex(
        "1+" + opnameCallToLatex("mod", "i", width + 1),
        opnameCallToLatex("floor", `\\frac{i}{${width + 1}}`)
      ) + ` \\operatorname{for} i=\\left[${polygon}\\right]`
    )
  );
}

function brackets(s) {
  return "\\left[" + s + "\\right]";
}

CanvasCycle = {
  processImage: ({ width, height, colors, cycles, pixels }) => {
    polygons = getPolygons(pixels, width, height);
    // console.log("Dimensions", width, height);
    // console.log("Polygon count:", polygons.flat().length);
    // console.log("Vertex count:", polygons.flat().flat().length);
    // console.log(
    //   "Unused palette colors:",
    //   polygons
    //     .map((p, i) => [p, i])
    //     .filter(([p, _]) => p.length == 0)
    //     .map(([_, i]) => i)
    // );
    const exprList = [
      {
        type: "expression",
        id: `ferrari-time`,
        latex: `t_0=0`,
        slider: {
          loopMode: "PLAY_INDEFINITELY",
          isPlaying: true,
        },
      },
      {
        type: "folder",
        id: "ferrari-helpers",
        title: "Helpers",
        collapsed: true,
      },
      {
        type: "expression",
        id: `ferrari-undefined`,
        latex: `u=[][1]`,
      },
      {
        type: "folder",
        id: "ferrari-polygons",
        title: "Polygons",
        collapsed: true,
      },
      ...polygons
        .map((polygonList, index) =>
          polygonList.map((polygon, subindex) => ({
            type: "expression",
            folderId: "ferrari-polygons",
            id: `ferrari-polygon-${index}-${subindex}`,
            colorLatex: `P_{${index}}`,
            lines: false,
            fillOpacity: "1",
            latex: polygonToLatex(polygon, width),
          }))
        )
        .flat(),
      {
        type: "folder",
        id: "ferrari-colors",
        title: "Colors",
        collapsed: true,
      },
      {
        type: "expression",
        folderId: "ferrari-colors",
        id: `ferrari-colors-list`,
        latex:
          `P_{all}=` +
          opnameCallToLatex(
            "rgb",
            brackets(colors.map(([r, _g, _b]) => r)),
            brackets(colors.map(([_r, g, _b]) => g)),
            brackets(colors.map(([_r, _g, b]) => b))
          ),
      },
      ...colors.map((rgb, index) => {
        const containedCycle = cycles.find(
          (cycle) => cycle.rate > 0 && cycle.low <= index && index <= cycle.high
        );
        // currently ignore `reversed`
        return {
          type: "expression",
          folderId: "ferrari-colors",
          id: `ferrari-color-${index}`,
          latex:
            `P_{${index}}=P_{all}` +
            brackets(
              containedCycle
                ? opnameCallToLatex(
                    "mod",
                    opnameCallToLatex(
                      "floor",
                      `\\frac{${60 * containedCycle.rate}t_0}{16384}`
                    ) + `+${index - containedCycle.low}`,
                    containedCycle.high - containedCycle.low + 1
                  ) + `+${containedCycle.low + 1}`
                : index + 1
            ),
        };
      }),
    ];
    const state = {
      version: 9,
      graph: {
        viewport: {
          xmin: 0,
          ymin: 0,
          xmax: width,
          ymax: height,
        },
      },
      expressions: {
        list: exprList,
      },
    };
    console.log(JSON.stringify(state, null, 2));
  },
};

const contents = fs.readFileSync("./templates/jungle_waterfall.js");
eval(contents.toString());
