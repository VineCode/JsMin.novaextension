// Run: node Support/tests.cjs (real CLI tests use uglifyjs from PATH).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {pathToFileURL} = require('node:url');
const prefix = 'VineCode.JsMin.';
let project, legacy, notifications, launches;
global.Issue = class {};
global.TextEditor = {isTextEditor: value => !!(value && value.document)};
global.IssueSeverity = {Error: 'error'};
global.IssueCollection = class {
  constructor() { this.entries = new Map(); }
  set(uri, issues) { this.entries.set(uri, issues); }
  remove(uri) { this.entries.delete(uri); }
  dispose() {}
};
global.NotificationRequest = class { constructor(id) { this.id = id; } };
global.Process = class {
  constructor(command, options) { this.command = command; this.args = options.args; }
  onStdout(fn) { this.out = fn; }
  onStderr(fn) { this.err = fn; }
  onDidExit(fn) { this.exit = fn; }
  start() {
    launches.push(this.args);
    this.child = spawn(this.command, this.args);
    this.child.stdout.on('data', data => this.out(String(data)));
    this.child.stderr.on('data', data => this.err(String(data)));
    this.child.on('close', status => this.exit(status));
  }
  terminate() { this.child.kill(); }
};
function reset(old = {}, current = {}) {
  legacy = new Map(Object.entries(old).map(([k,v]) => [prefix+k,v]));
  project = new Map(Object.entries(current).map(([k,v]) => [prefix+k,v]));
  notifications = []; launches = [];
  global.nova = {
    config: {get: key => legacy.get(key)},
    workspace: {config: {get: key => project.get(key), set: () => { throw new Error('Extension must not write configuration'); }}},
    notifications: {add: request => { notifications.push(request); return new Promise(() => {}); }, cancel() {}}
  };
}
const Service = require('../Scripts/NovaJsMinService');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'jsmin-tests-'));
function editor(file) { return {document: {path: file, uri: pathToFileURL(file).href, isDirty: false}}; }
async function main() {
  reset({minifyOnSave:'No',mangle:'No',sourceMap:'No',execPath:'/custom path/uglifyjs'});
  let service = new Service();
  assert.equal(service.setting('minifyOnSave'), 'No');
  assert.equal(service.setting('execPath'), '/custom path/uglifyjs');
  project.set(prefix+'mangle','Yes'); new Service();
  assert.equal(service.setting('mangle'),'Yes', 'Project choice must override legacy');
  reset(); service = new Service();
  for(const key of ['minifyOnSave','sourceMap']) assert.equal(service.setting(key),'Yes');
  assert.equal(service.setting('mangle'),'Yes');
  assert.equal(service.setting('outputFormat'),'Compact');
  assert.equal(service.setting('keepComments'),'No');
  const remote = {document:{path:'/remote/main.js',uri:'sftp://example/main.js',isRemote:true}};
  await service.minifyJsFileOnSave(remote);
  await service.minifyJsFileOnSave(remote);
  assert.equal(launches.length,0);
  assert.equal(notifications.length,1);
  assert.equal(service.accepts(editor('/tmp/notjs'),true,false),false);
  assert.equal(service.accepts(editor('/tmp/file.min.js'),true,false),false);

  // Errors remain until that file compiles successfully; other files retain issues.
  reset(); service = new Service();
  service.executable = async () => 'mock';
  service.run = async () => ({status:1,stdout:'',stderr:'Parse error at /tmp/one.js:4,7\nERROR: Unexpected token\n'});
  await service.minifyJsFileOnCommand(editor('/tmp/one.js'));
  const issue = service.issues.entries.get('file:///tmp/one.js')[0];
  assert.equal(issue.line,4); assert.equal(issue.column,8);
  await service.minifyJsFileOnCommand(editor('/tmp/two.js'));
  service.run = async () => ({status:0,stdout:'',stderr:'WARN: example warning\n'});
  await service.minifyJsFileOnCommand(editor('/tmp/one.js'));
  assert.equal(service.issues.entries.has('file:///tmp/one.js'),false);
  assert.equal(service.issues.entries.has('file:///tmp/two.js'),true);

  // Installation command must finish even when its notification is not dismissed.
  service.version = async p => ({path:p,version:'uglify-js 3.19.3'});
  await service.checkInstallation();
  assert.match(notifications.at(-1).title,/is installed/);
  reset(); service = new Service();
  service.version = async p => p === '/opt/homebrew/bin/uglifyjs' ? {path:p,version:'uglify-js 3.19.3'} : null;
  await service.resolveExecutables();
  assert.equal(service.setting('execPath'),'uglifyjs');
  assert.equal(await service.executable(),'/opt/homebrew/bin/uglifyjs');
  assert.equal(project.size,0,'Detection must not persist settings');
  project.set(prefix+'execPath','/missing custom/uglifyjs');
  await service.resolveExecutables();
  assert.equal(service.setting('execPath'),'/missing custom/uglifyjs','Do not replace custom paths');

  const RealProcess = global.Process;
  global.Process = class { constructor() { throw new Error('Cannot launch'); } };
  assert.equal((await service.run('missing',[])).status,-1);
  let terminated = false;
  global.Process = class {
    onStdout() {} onStderr() {} onDidExit() {} start() {}
    terminate() { terminated = true; }
  };
  assert.equal((await service.run('hanging',[],5)).status,-1);
  assert.equal(terminated,true);
  global.Process = RealProcess;

  if(spawnSync('/usr/bin/env',['uglifyjs','--version']).status !== 0) throw new Error('Install uglify-js to run integration tests');
  reset({}, {execPath:'uglifyjs',minifyOnSave:'No'}); service = new Service();
  const dir = path.join(temp,'domain.js with spaces'); fs.mkdirSync(dir);
  const source = path.join(dir,'example.js');
  fs.writeFileSync(source,'function double(value) { return value * 2; } console.log(double(3));\n');
  const current = editor(source);
  await service.minifyJsFileOnSave(current);
  assert.equal(launches.length,0);
  current.document.isDirty = true;
  current.save = async () => {
    fs.writeFileSync(source,'function double(value) { return value * 4; } console.log(double(3));\n');
    current.document.isDirty = false;
    await service.minifyJsFileOnSave(current);
  };
  project.set(prefix+'minifyOnSave','Yes');
  await service.minifyJsFileOnCommand(current);
  assert.equal(launches.filter(args=>args.includes('--compress')).length,1,'Save should not double-run');
  const output = path.join(dir,'example.min.js');
  assert.equal(spawnSync(process.execPath,[output],{encoding:'utf8'}).stdout.trim(),'12');
  assert.ok(fs.existsSync(output+'.map'));
  project.set(prefix+'minifyOnSave','No');
  await service.minifyJsFileOnCommand(current);
  assert.equal(launches.filter(args=>args.includes('--compress')).length,2,'Manual works with auto off');
  fs.writeFileSync(source,'const x = ;\n');
  await service.minifyJsFileOnCommand(current);
  assert.equal(service.issues.entries.get(current.document.uri)[0].line,1);
  assert.equal(service.issues.entries.get(current.document.uri)[0].column,11);
  fs.writeFileSync(source,'function good(x){return x+1;}\n');
  await service.minifyJsFileOnCommand(current);
  assert.equal(service.issues.entries.size,0);
  const wrapper = path.join(temp,'uglify with spaces');
  const located = spawnSync('/usr/bin/which',['uglifyjs'],{encoding:'utf8'}).stdout.trim();
  fs.symlinkSync(located,wrapper);
  project.set(prefix+'execPath',wrapper);
  assert.ok(await service.version(wrapper));
  await service.minifyJsFileOnCommand(current);
  assert.equal(service.issues.entries.size,0);
  await service.beautifyJsFileOnCommand(current);
  assert.match(fs.readFileSync(source,'utf8'),/return x \+ 1/);
  assert.deepEqual(service.buildArgs(false),['--compress','--mangle','--source-map']);
  project.set(prefix+'keepFunctionNames','No');
  assert.ok(!service.buildArgs(false).includes('--keep-fnames'));
  project.set(prefix+'keepFunctionNames','Yes');
  assert.ok(service.buildArgs(false).includes('--keep-fnames'));
  project.set(prefix+'outputSuffix','.compiled.js');
  assert.equal(service.outputPath(source),path.join(dir,'example.compiled.js'));
  await service.minifyJsFileOnCommand(current);
  assert.ok(fs.existsSync(path.join(dir,'example.compiled.js')));
  assert.ok(fs.existsSync(path.join(dir,'example.compiled.js.map')));
  assert.equal(service.accepts(editor(path.join(dir,'example.compiled.js')),false,false),false);
  assert.equal(service.accepts(editor(path.join(dir,'example.compiled.js')),true,true),true);
  for(const invalid of ['.js','../out.js','/out.js','.min.css']) {
    project.set(prefix+'outputSuffix',invalid);
    assert.throws(()=>service.outputPath(source),/Output Suffix/);
  }
  project.set(prefix+'outputSuffix','');
  assert.equal(service.outputPath(source),output);
  project.set(prefix+'compress','No');
  project.set(prefix+'sourceMap','No');
  project.set(prefix+'mangle','No');
  project.set(prefix+'keepComments','Yes');
  project.set(prefix+'outputFormat','Beautified');
  project.set(prefix+'indent','2');
  project.set(prefix+'wrap','ExampleLibrary');
  project.set(prefix+'mangleProps','Yes');
  project.set(prefix+'propertyPattern','^_');
  project.set(prefix+'reservedProperties','_reserved');
  fs.writeFileSync(source,'/* keep me */ exports.result = {_private: 1, _reserved: 2, "_quoted": 3};\n');
  nova.workspace.activeTextEditor = current;
  await service.minifyJsFileOnCommand();
  const configuredOutput = fs.readFileSync(output,'utf8');
  assert.match(configuredOutput,/keep me/);
  assert.match(configuredOutput,/ExampleLibrary/);
  assert.match(configuredOutput,/_reserved/);
  assert.match(configuredOutput,/_quoted/);
  assert.doesNotMatch(configuredOutput,/_private/);
  assert.deepEqual(service.buildArgs(true),['--beautify','indent_level=2','--comments','all']);
  await service.beautifyJsFileOnCommand();
  assert.doesNotMatch(fs.readFileSync(source,'utf8'),/ExampleLibrary/);
  project.set(prefix+'propertyPattern','[');
  assert.throws(()=>service.buildArgs(false));
  project.set(prefix+'propertyPattern','');
  project.set(prefix+'wrap','bad name');
  assert.throws(()=>service.buildArgs(false),/Wrap Module/);
  reset({}, {beautifyOutput:'Yes', comments:'License', mangle:'Yes'});
  service = new Service();
  assert.equal(service.setting('outputFormat'),'Beautified');
  assert.equal(service.setting('keepComments'),'Yes');
  assert.equal(service.setting('commentFilter'),'License');
  assert.ok(service.buildArgs(false).includes('--mangle'));
  project.set(prefix+'outputFormat','Compact');
  project.set(prefix+'keepComments','No');
  new Service();
  assert.equal(service.setting('outputFormat'),'Compact');
  assert.ok(!service.buildArgs(false).includes('--comments'));
  reset({mangle:'No', minifyOnSave:'No'}, {mangle:'inherit', minifyOnSave:'inherit', outputFormat:'inherit'});
  service = new Service();
  assert.equal(service.setting('mangle'),'No');
  assert.equal(service.setting('minifyOnSave'),'No');
  assert.equal(service.setting('outputFormat'),'Compact');
  assert.equal(project.size,3,'Activation must not populate project settings');
  const currentEditor = editor('/tmp/current.js');
  const menuEditor = editor('/tmp/editor-menu.js');
  nova.workspace.activeTextEditor = currentEditor;
  const invoked = [];
  service.compile = async (target, manual, beautify) => { invoked.push({target, manual, beautify}); };
  for(const name of ['minifyJsFileOnCommand','beautifyJsFileOnCommand']) {
    const beautify = name === 'beautifyJsFileOnCommand';
    for(const [context, expected] of [[nova.workspace,currentEditor],[menuEditor,menuEditor],[undefined,currentEditor],[{activeTextEditor:null},null]]) {
      await service[name](context);
      assert.deepEqual(invoked.pop(),{target:expected,manual:true,beautify});
    }
  }
  // Exercise the actual pipeline with Nova's Extensions-menu argument and auto off.
  reset({}, {minifyOnSave:'No', execPath:wrapper, sourceMap:'No'});
  service = new Service();
  nova.workspace.activeTextEditor = current;
  await service.minifyJsFileOnCommand(nova.workspace);
  assert.ok(launches.some(args => args.includes('--compress')));
  await service.beautifyJsFileOnCommand(nova.workspace);
  assert.ok(launches.some(args => args.includes('--beautify')));
  const count = launches.length;
  nova.workspace.activeTextEditor = null;
  await service.minifyJsFileOnCommand(nova.workspace);
  await service.beautifyJsFileOnCommand(nova.workspace);
  assert.equal(launches.length,count,'No editor must safely do nothing');
  console.log('All JsMin tests passed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => fs.rmSync(temp,{recursive:true,force:true}));
