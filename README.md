# JsMin Extension for Nova

Automatically minify js files on save. Menu options to Compress, Mangle or Beautify current script.

## Requirements

Before using this extension, you must ensure that `uglifyjs` is installed on your system.

## UglifyJS Install

1. Install [Node](https://nodejs.org).
	1. Via the [Node](https://nodejs.org) website
	2. or using [Homebrew](https://brew.sh/) `brew install node`
2. Via Terminal run `npm install uglify-es -g`

## Extension Installation

1. Open Nova.
2. Choose menu **Extensions** > **Extension Library...**
3. Search extension `NovaJsMin`
5. Click **Install**.

## Preferences
**Minify on Save**<br/>
`Yes, No`<br/>
Automatically minify .js files on save

**Change Output Path - Source**<br/>
`/path/to/js/src`<br/>
To change the output path, first specify the root of all un-minified js files, so subdirectories below this point can be preserved in the destination. Files outside this path will be minified in place.

**Change Output Path - Destination**<br/>
`/path/to/js/min`<br/>
You must also specify which directory will be the root for all minified files.

**Mangle**<br/>
`Yes, No`<br/>
Mangle names

**Generate Source Map**<br/>
`Yes, No`<br/>
Enable source map file generation

**Executable Path**<br/>
`/path/to/uglifyjs`<br/>
Manually enter or select the uglifyjs binary location.
