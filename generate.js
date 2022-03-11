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
function getPolygons(pixels, width) {
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
        xy_to_i(xy, width + 1)
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
      currList.push(...polygon, polygon[0], "[][1]");
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
    "\\left[" +
      pointToLatex(
        opnameCallToLatex("mod", "i", width + 1),
        opnameCallToLatex("floor", `\\frac{i}{${width + 1}}`)
      ) +
      ` \\operatorname{for} i=\\left[${polygon}\\right]` +
      "\\right]"
  );
}

CanvasCycle = {
  processImage: ({ width, height, colors, cycles, pixels }) => {
    polygons = getPolygons(pixels, width);
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
    ];
    const state = {
      version: 9,
      graph: {
        viewport: {
          xmin: -10,
          ymin: -10,
          xmax: width + 10,
          ymax: height + 10,
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
