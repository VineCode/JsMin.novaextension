// JsMin Extension for Nova. Copyright © Vine Code Limited.
const PREFIX = 'VineCode.JsMin.';
class JsMinService {
  constructor() {
    this.issues = new IssueCollection('JsMin');
    this.saving = new Set();
    this.jobs = new Map();
    this.processes = new Map();
    // Do not write configuration during activation: Nova can deadlock while
    // opening a project and processing extension-originated settings writes.
  }
  setting(key) {
    const value = nova.workspace.config.get(PREFIX + key);
    if(value != null && value !== 'inherit') return value;
    if(['minifyOnSave', 'mangle', 'sourceMap', 'execPath'].includes(key)) {
      const legacy = nova.config.get(PREFIX + key);
      if(legacy != null) return legacy;
      return key === 'execPath' ? 'uglifyjs' : 'Yes';
    }
    if(key === 'outputFormat') return this.setting('beautifyOutput') === 'Yes' ? 'Beautified' : 'Compact';
    if(key === 'keepComments') return ['All', 'License'].includes(this.setting('comments')) ? 'Yes' : 'No';
    if(key === 'commentFilter') return this.setting('comments') === 'License' ? 'License' : 'All';
    return value;
  }
  resolveSettingChoices(key, values) {
    const saved = nova.workspace.config.get(PREFIX + key);
    const effective = this.setting(key);
    // Label the unset value with its effective choice, without persisting it.
    // Nova saves explicit values only when the user selects another choice.
    return values.map(value => [
      (saved == null || saved === 'inherit') && value === effective ? 'inherit' : value,
      value
    ]);
  }
  notify(id, title, body) {
    if(this.disposed) return;
    const request = new NotificationRequest(id);
    request.title = title;
    request.body = body;
    request.actions = ['Dismiss'];
    // Do not return the notification promise: it waits for dismissal.
    nova.notifications.add(request).catch(error => console.error(String(error)));
  }
  accepts(editor, manual, beautify) {
    const doc = editor && editor.document;
    if(!doc || !/\.js$/i.test(doc.path || doc.uri || '')) return false;
    if(doc.isRemote || !doc.path || (doc.uri && !doc.uri.startsWith('file://'))) {
      if(manual || !this.remoteNotified) {
        console.warn('JsMin requires local files. Remote files are unsupported.');
        this.notify('jsmin-remote', 'JsMin cannot process remote files',
          'Use a local project, minify locally, then upload the generated JavaScript with Nova Publishing.');
        this.remoteNotified = true;
      }
      return false;
    }
    const suffix = (this.setting('outputSuffix') || '.min.js').trim() || '.min.js';
    return beautify || (!/\.min\.js$/i.test(doc.path) &&
      (suffix.toLowerCase() === '.js' || !doc.path.toLowerCase().endsWith(suffix.toLowerCase())));
  }
  outputPath(source) {
    const suffix = (this.setting('outputSuffix') || '.min.js').trim() || '.min.js';
    // Require a distinct JS suffix, never a path or the source extension alone.
    if(!/^\.[A-Za-z0-9_-][A-Za-z0-9._-]*\.js$/i.test(suffix)) {
      throw new Error('Output Suffix must be a distinct JavaScript suffix such as .min.js or .compiled.js (not .js or a folder path).');
    }
    return source.replace(/\.js$/i, suffix);
  }
  run(executable, args, timeout = 120000) {
    return new Promise(resolve => {
      let process, timer, finished = false, stdout = '', stderr = '';
      const finish = status => {
        if(finished) return;
        finished = true;
        clearTimeout(timer);
        this.processes.delete(process);
        resolve({status, stdout, stderr});
      };
      try {
        process = new Process('/usr/bin/env', {args: [executable, ...args]});
        this.processes.set(process, () => { finish(-1); process.terminate(); });
        process.onStdout(chunk => { stdout += chunk; });
        process.onStderr(chunk => { stderr += chunk; });
        process.onDidExit(finish);
        timer = setTimeout(() => {
          stderr += '\nJsMin process timed out.';
          finish(-1);
          process.terminate();
        }, timeout);
        process.start();
      } catch(error) { stderr += String(error); finish(-1); }
    });
  }
  async version(path) {
    const result = await this.run(path, ['--version'], 5000);
    const version = (result.stdout || result.stderr).trim().split('\n')[0];
    return result.status === 0 && /uglify/i.test(version) ? {path, version} : null;
  }
  async resolveExecutables() {
    const configured = this.setting('execPath');
    const paths = [...new Set([configured, 'uglifyjs', '/opt/homebrew/bin/uglifyjs', '/usr/local/bin/uglifyjs'].filter(Boolean))];
    const results = (await Promise.all(paths.map(path => this.version(path)))).filter(Boolean);
    if(this.disposed) return [];
    this.pathInstallation = results.find(item => item.path === 'uglifyjs');
    this.detectedExecutable = results.length ? results[0].path : null;
    const choices = results.map(item => [item.path, item.version + ' — ' + (item.path === 'uglifyjs' ? 'Nova PATH' : item.path)]);
    if(configured && !results.some(item => item.path === configured)) choices.push([configured, configured + ' — not found or not responding']);
    const saved = nova.workspace.config.get(PREFIX + 'execPath');
    if(saved == null || saved === 'inherit') {
      const effective = configured && configured !== 'uglifyjs' ? configured : this.detectedExecutable || configured;
      const selected = choices.find(choice => choice[0] === effective);
      if(selected) selected[0] = 'inherit';
      else choices.unshift(['inherit', 'UglifyJS not found — enter a custom path']);
    }
    return choices;
  }
  async executable() {
    const configured = this.setting('execPath');
    if(configured && configured !== 'uglifyjs') return configured;
    if(this.pathInstallation) return 'uglifyjs';
    await this.resolveExecutables();
    return this.detectedExecutable || this.setting('execPath') || 'uglifyjs';
  }
  async checkInstallation() {
    const path = await this.executable();
    const result = await this.version(path);
    this.notify('jsmin-installation', result ? result.version + ' is installed' : 'UglifyJS was not found or did not respond',
      result ? 'Executable: ' + path : 'Install with npm install --global uglify-js, then select the executable in JsMin project settings.');
  }
  minifyJsFileOnSave(editor) {
    if(this.setting('minifyOnSave') === 'No' || this.saving.has(editor)) return;
    return this.compile(editor, false, false);
  }
  commandEditor(context) {
    // Editor-menu commands receive a TextEditor; other contexts receive a Workspace.
    if(context && TextEditor.isTextEditor(context)) return context;
    return context ? context.activeTextEditor : nova.workspace.activeTextEditor;
  }
  minifyJsFileOnCommand(context) { return this.compile(this.commandEditor(context), true, false); }
  beautifyJsFileOnCommand(context) { return this.compile(this.commandEditor(context), true, true); }
  buildArgs(beautify) {
    const indent = ['2', '4', '8'].includes(this.setting('indent')) ? this.setting('indent') : '4';
    // Beautify Now is formatting only: never wrap, compress or rename source code.
    if(beautify) return ['--beautify', 'indent_level=' + indent, '--comments', 'all'];
    const args = [];
    if(this.setting('compress') !== 'No') args.push('--compress');
    if(this.setting('mangle') === 'Yes') args.push('--mangle');
    if(this.setting('sourceMap') !== 'No') args.push('--source-map');
    if(this.setting('keepFunctionNames') === 'Yes') args.push('--keep-fnames');
    if(this.setting('outputFormat') === 'Beautified') args.push('--beautify', 'indent_level=' + indent);
    if(this.setting('keepComments') === 'Yes') {
      args.push('--comments', this.setting('commentFilter') === 'License' ? '/@license|@preserve|^!/' : 'all');
    }
    const wrap = (this.setting('wrap') || '').trim();
    if(wrap) {
      if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(wrap)) throw new Error('Wrap Module must be a simple JavaScript name, e.g. MyLibrary.');
      args.push('--wrap', wrap);
    }
    if(this.setting('mangleProps') === 'Yes') {
      const options = ['keep_quoted=' + (this.setting('keepQuotedProps') !== 'No')];
      const pattern = (this.setting('propertyPattern') || '').trim();
      if(pattern) options.push('regex=' + new RegExp(pattern).toString());
      const reserved = (this.setting('reservedProperties') || '').split(',').map(name => name.trim()).filter(Boolean);
      if(reserved.length) options.push('reserved=' + JSON.stringify(reserved));
      args.push('--mangle-props', options.join(','));
    }
    return args;
  }
  async compile(editor, manual, beautify) {
    if(!this.accepts(editor, manual, beautify)) return;
    const source = editor.document.path;
    // Serialize each file's runs to prevent stale output and diagnostics.
    const previous = this.jobs.get(source) || Promise.resolve();
    const job = previous.catch(() => {}).then(async () => {
      if(this.disposed) return;
      try {
        if(manual && editor.document.isDirty) {
          this.saving.add(editor);
          try { await editor.save(); } finally { this.saving.delete(editor); }
        }
        const executable = await this.executable();
        if(this.disposed) return;
        const target = beautify ? source : this.outputPath(source);
        const args = this.buildArgs(beautify);
        args.push('--output', target, '--', source);
        console.log((beautify ? 'Beautifying ' : 'Minifying ') + source);
        const result = await this.run(executable, args);
        if(this.disposed) return;
        if(result.stdout.trim()) console.log(result.stdout.trim());
        if(result.stderr.trim()) {
          if(result.status === 0) console.warn(result.stderr.trim());
          else console.error(result.stderr.trim());
        }
        const uri = editor.document.uri || 'file://' + source.split('/').map(encodeURIComponent).join('/');
        if(result.status !== 0) {
          const location = result.stderr.match(/^Parse error at (.+):(\d+),(\d+)\s*$/m);
          const detail = result.stderr.match(/^ERROR:\s*(.+)$/m);
          const message = detail ? detail[1] : result.stderr.trim() || 'UglifyJS exited with status ' + result.status;
          if(location) {
            const issue = new Issue();
            issue.message = message;
            issue.source = 'JsMin';
            issue.severity = IssueSeverity.Error;
            issue.line = Number(location[2]);
            issue.column = Number(location[3]) + 1; // UglifyJS uses zero-based columns.
            this.issues.set(uri, [issue]);
          } else this.issues.remove(uri); // Launch failures have no source location.
          this.notify('jsmin-error', 'JavaScript ' + (beautify ? 'Beautify' : 'Minify') + ' Error', message);
        } else {
          this.issues.remove(uri);
          nova.notifications.cancel('jsmin-error');
          console.log((beautify ? 'Beautified ' : 'Minified ') + source + ' → ' + target);
        }
      } catch(error) {
        console.error(String(error));
        this.notify('jsmin-error', 'JsMin could not process the file', String(error));
      }
    });
    this.jobs.set(source, job);
    await job;
    if(this.jobs.get(source) === job) this.jobs.delete(source);
  }
  dispose() {
    this.disposed = true;
    for(const stop of this.processes.values()) stop();
    this.issues.dispose();
  }
}
module.exports = JsMinService;
