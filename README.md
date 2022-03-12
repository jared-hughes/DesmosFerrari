# Desmos Ferrari

This repository houses a script that converts ILBM files to Desmos graphs. More precisely, the input is not a pure ILBM file but one which has been converted to JS at [http://effectgames.com/demos/canvascycle](http://effectgames.com/demos/canvascycle). After downloading one of those files, run

```bash
node generate.js templates/jungle_waterfall.js 'Jungle Waterfall'
```

to generate the JSON for a Desmos graph. Piping this to `xclip -selection c` is helpful, or you could put the output to a file and copy that.

Once you have the JSON on your system clipboard, run the following command in the JavaScript developer tools on [https://www.desmos.com/calculator](https://www.desmos.com/calculator) to apply the graph state.

```js
console.log("Click on the webpage to focus it");
setTimeout(async () => {
  const stateString = await navigator.clipboard.readText();
  Calc.setState(JSON.parse(stateString));
}, 1000);
```
