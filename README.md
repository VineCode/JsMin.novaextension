# JsMin Extension for Nova

Minify local JavaScript files automatically on save, or compile and beautify the current file using Nova’s Extensions menu.

## Requirements and installation

Install Node.js, then install UglifyJS from Terminal:

```sh
npm install --global uglify-js
```

Install JsMin from Nova’s Extension Library and open a local project. Use **Check UglifyJS Installation** in the project settings to confirm the executable and version. Supported JavaScript syntax depends on your installed UglifyJS version.

## Automatic compilation

By default, saving `scripts/main.js` generates `scripts/main.min.js` and its source map. The output is compact and compressed, comments are removed, and eligible names are shortened.

Only the saved file is processed—not every JavaScript file in the project. Files ending in `.min.js` or your chosen output suffix are skipped.

## Manual compilation

Choose **Extensions → JsMin → Compile Now** to process the current local JavaScript file using your project settings. Output is written beside the source using the configured suffix.

This works even when **Run on Save** is No. Unsaved changes are saved before processing. Save a new, untitled file locally before using the command.

## Beautify the current file

Choose **Extensions → JsMin → Beautify Now** to format the current local JavaScript file with readable indentation and line breaks.

This command updates the source file in place and preserves comments. It does not compress, wrap or mangle the code, and works even when Run on Save is No. Keep a backup or use version control before formatting.

Both manual commands are also available in the editor menu.

## Project settings

Open **Project → Project Settings → Languages & Extensions → JsMin**.

Each project can have its own settings. The controls show saved project choices or the defaults below. Your first change saves the complete set of displayed project choices. Opening a project or viewing settings does not save preferences.

### General

- **Run on Save:** Process local JavaScript files after saving. Default: Yes.
- **Generate Source Map:** Write a `.map` file beside the output to help browser debugging refer back to the original source. Default: Yes.

### Output

- **Output Format:** Compact removes unnecessary spaces and line breaks; Beautified adds readable formatting. Default: Compact. Compression and mangling are controlled separately under Advanced.
- **Output Suffix:** Replace the source’s `.js` extension with this suffix. Default: `.min.js`.
- **Keep Comments:** Preserve comments in compiled output. Default: No. When enabled, Advanced → Comments to Keep selects which comments to retain.

For example, an output suffix of `.compiled.js` turns `scripts/main.js` into `scripts/main.compiled.js`, with `main.compiled.js.map` when source maps are enabled.

An empty suffix uses `.min.js`. Choose a distinct suffix ending in `.js`, not `.js` alone or a folder path. Changing the suffix does not delete older output files. Beautify Now always updates the source instead.

### Advanced

- **Compression:** Optimise the code by simplifying expressions and removing unnecessary code. Default: Yes. Compression can be used with either Compact or Beautified output.
- **Mangle Names:** Shorten eligible variable and parameter names. Default: Yes. Top-level names are not mangled.
- **Preserve Function Names:** Protect function names during compression and mangling. Useful for code relying on `Function.name` or clearer stack traces. Default: No. Choosing No allows optimisation; it does not force names to change.
- **Indent Size:** A whole number from 0 to 16 spaces for beautified output, including Beautify Now. Default: 4.
- **Comments to Keep:** All or License (`@license`, `@preserve`, or comments starting with `!`). Only applies when Keep Comments is Yes. Default: All. Compression may still discard comments attached to removed code.
- **Wrap Module:** An optional module name, such as `MyLibrary`. Wraps the code with `exports` and `global` available inside it. This does not bundle dependencies. Default: empty.
- **Mangle Properties:** Rename object properties. Default: No. **Use with caution:** this can break public APIs, JSON keys and properties shared across separately compiled files. Do not assume property names will stay consistent between files.
- **Property Name Pattern:** An optional regular expression body, without `/` delimiters, to restrict property mangling. For example, `^_` targets names starting with an underscore. Empty targets all eligible properties.
- **Reserved Properties:** Comma-separated property names to exclude from property mangling.
- **Keep Quoted Properties:** Exclude quoted property names from property mangling. Default: Yes.

These options apply to automatic compilation and Compile Now. Beautify Now uses only Indent Size and always preserves comments.

### UglifyJS installation

**UglifyJS Executable** lists detected installations and their versions. The initial selection uses your previous executable preference or an automatically detected installation. Choose a listed executable or enter a custom path to use a specific installation for this project.

JsMin checks Nova’s PATH, `/opt/homebrew/bin/uglifyjs`, and `/usr/local/bin/uglifyjs`. Paths containing spaces are supported.

**Check UglifyJS Installation** displays the installation status, version and executable path. If the executable cannot be found or does not respond, install UglifyJS or correct the selection.

## Errors and warnings

Syntax errors appear in Nova’s Issues sidebar and highlight the reported location in the editor. Fix the error and compile that file again to clear it. UglifyJS usually reports the first syntax error it encounters.

Compilation failures also display a notification. The Extension Console contains full error details and output paths. Problems such as a missing executable or insufficient permissions are reported there and in a notification, without a source-line highlight.

Non-fatal warnings are logged in the console and do not prevent successful compilation.

## Remote files

JsMin supports local files only. Attempting to process a remote JavaScript file displays a warning.

For remote websites, keep a local project, compile locally, and use Nova Publishing to upload the generated JavaScript and optional source maps.

## Upgrading to 1.0

Settings are now per project. There are no global settings to view or edit in this version.

### Please note!

After upgrading, projects without saved JsMin settings continue using your previous global preferences, so compilation behaves as before. However, the project radio buttons show this version's defaults, not those old global values.

Changing **any JsMin project setting** saves the complete set of project choices: the values you select, any already saved project choices, and our defaults for everything else. Old global preferences are not copied across. From then on, only project settings are used, including after reopening the project. Simply opening settings does not trigger this switch.

Review all the options before making your first change, particularly Run on Save, Mangle Names and Generate Source Map. If you previously used a custom UglifyJS path, select it explicitly when switching to project settings; otherwise automatic detection is used.

The previous compilation defaults are retained: run on save, compression, name mangling and source maps enabled; compact output, comments removed, and `.min.js` output. Function-name preservation, property mangling and wrapping are off by default.

Your installed UglifyJS version and chosen settings can affect the generated output.

## Troubleshooting

- **Executable not found:** Use Check UglifyJS Installation, select the correct executable, and confirm Node.js is installed. Nova’s PATH may differ from Terminal’s.
- **No output on save:** Check Run on Save and ensure the file is local, ends in `.js`, and does not already end in the output suffix or `.min.js`. Try Compile Now and check the Extension Console.
- **Unexpected renamed variables:** Set Mangle Names to No. Compression remains independent.
- **Code relies on function names:** Enable Preserve Function Names.
- **Old output remains after changing the suffix:** Remove obsolete generated files after checking that your site no longer references them.
