# ChangeLog

## Version 1.1

- Simplify Editor → JsMin command labels to Compile Now and Beautify Now, removing the redundant JsMin prefix.
- Disable the Extensions → JsMin compilation and beautification commands when no JavaScript editor is active, matching the Editor menu.
- Compilation behaviour, settings and defaults are unchanged from 1.0.

## Version 1.0

- Configure each project independently, with simple radio-button choices. Existing global preferences continue to apply until project settings are customised; the first change saves the selected project values and defaults without copying old globals. Previous compilation defaults are retained.
- Organise settings into General, Output, Advanced, and UglifyJS Installation.
- Add Compact/Beautified output, configurable output suffix (default `.min.js`), comment preservation, compression and function-name controls.
- Add a numeric Indent Size setting for beautified output, accepting 0–16 spaces with a default of 4.
- Add optional wrapping and property mangling with pattern and reserved-name controls. These remain disabled by default.
- Add Compile Now and Beautify Now under Extensions → JsMin and as JsMin-labelled commands in the editor menu. Both target the current local file and work with Run on Save disabled. Beautify Now formats the source in place and preserves comments without compression or mangling.
- Detect UglifyJS installations and show executable/version choices with an installation status check.
- Report syntax errors in Issues and at their editor locations; log full diagnostics and processing results in the Extension Console.
- Clearly warn about unsupported remote files without launching the compiler.
- Improve compilation reliability by processing the latest saved contents and preventing overlapping operations on the same file.
- Correct output paths when parent directories contain `.js`; support executable paths containing spaces.
- Improve error handling so non-fatal warnings are not treated as compilation failures.
- Replace the icon with a shaded yellow button, black lettering and transparent background.

## Version 0.7.1
- Bug fix for exec path

## Version 0.7
- Icon Updates and internal restructure

## Version 0.6 
- Updated README

## Version 0.5 
- Auto hide the error notification after 10 seconds or if the file is re-saved without an error.
- Other bug fixes

## Version 0.4
- Fix autosave preference

## Version 0.2

- Basic functional release
