/*
Paste using:

setTimeout(async () => {
  const stateString = await navigator.clipboard.readText();
  Calc.setState(JSON.parse(stateString));
}, 1000);
*/

const fs = require("fs");

/**
 * Assume pixels is a 1D array in row-major order, representing a 2D array of
 * the given width.
 *
 * Return a 256-list of polygons. The polygons are disjoint, and their
 * union is the full image. Each polygons is represented by a list of numbers,
 * where (number%width, number//width) is the corresponding vertex coordinate.
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
    polygonsByColor[pixels[i]].push([i, i + width, j + width, j]);
  }
  // Join up polygons of the same pixel color
  const out = Array.from({ length: 256 }).map((_) => []);
  polygonsByColor.forEach((polygonList, i) => {
    for (let polygon of polygonList) {
      // join up with the first vertex, then add an undefined point
      out[i].push(...polygon, polygon[0], "[][1]");
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
        opnameCallToLatex("mod", "i", width),
        opnameCallToLatex("floor", `\\frac{i}{${width}}`)
      ) +
      ` \\operatorname{for} i=\\left[${polygon}\\right]` +
      "\\right]"
  );
}

CanvasCycle = {
  processImage: ({ width, height, colors, cycles, pixels }) => {
    polygons = getPolygons(pixels, width);
    // console.log("Dimensions", width, height);
    // console.log("Polygon count:", polygons.length);
    // console.log("Vertex count:", polygons.flat().length);
    // console.log(
    //   "Unused palette colors:",
    //   polygons
    //     .map((p, i) => [p, i])
    //     .filter(([p, _]) => p.length == 0)
    //     .map(([_, i]) => i)
    // );
    // console.log("Total area:", polygons.map())
    const exprList = [
      {
        type: "folder",
        id: "ferrari-polygons",
        title: "Polygons",
        collapsed: true,
      },
      ...polygons.slice(3, 4).map((polygon, index) => ({
        type: "expression",
        folderId: "ferrari-polygons",
        colorLatex: `P_{${index}}`,
        lines: false,
        fillOpacity: "1",
        latex: polygonToLatex(polygon, width),
      })),
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
