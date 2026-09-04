# ChangeLog

## Version 1.0

- Configure each project independently, with support for existing global preferences and the previous compilation defaults.
- Organise settings into General, Output, Advanced, and UglifyJS Installation.
- Add Compact/Beautified output, configurable output suffix (default `.min.js`), comment preservation, indentation, compression and function-name controls.
- Add optional wrapping and property mangling with pattern and reserved-name controls. These remain disabled by default.
- Add JsMin: Compile Now and JsMin: Beautify Now to the Extensions and editor menus. Both target the current local file and work with Run on Save disabled. Beautify Now formats the source in place and preserves comments without compression or mangling.
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
