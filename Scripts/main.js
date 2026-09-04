const JsMinService = require('./NovaJsMinService');
exports.activate = function() {
  const service = new JsMinService();
  nova.subscriptions.add(service);
  const editors = new WeakSet();
  const attach = editor => {
    if(editors.has(editor)) return;
    editors.add(editor);
    nova.subscriptions.add(editor.onDidSave(service.minifyJsFileOnSave.bind(service)));
  };
  nova.workspace.textEditors.forEach(attach);
  nova.subscriptions.add(nova.workspace.onDidAddTextEditor(attach));
  nova.commands.register('JsMin.minifyFile', service.minifyJsFileOnCommand.bind(service));
  nova.commands.register('JsMin.beautifyFile', service.beautifyJsFileOnCommand.bind(service));
  nova.commands.register('JsMin.resolveExecutables', service.resolveExecutables.bind(service));
  nova.commands.register('JsMin.checkInstallation', service.checkInstallation.bind(service));
};
