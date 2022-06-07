//
// JsMin Extension for Nova
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class JsMinService {
  
	constructor() {

	}

  /*
  getArgs
  */
  
  get getArgs() {
    
    var mangle  = nova.workspace.config.get('VineCode.JsMin.mangle');
    var sourceMap = nova.workspace.config.get('VineCode.JsMin.sourceMap');
    var execPath  = nova.workspace.config.get('VineCode.JsMin.execPath');
    
    if(!execPath) {
      execPath = 'uglifyjs';
    }
    
    execPath = execPath.replace(/(\s+)/g, '\\$1');
    
    var options = [];
    
    options.push(execPath);
    
    options.push('--compress');
 
    if(mangle == 'Yes') {
      options.push('-m');
    }
 
    if(sourceMap == 'Yes') {
      options.push('--source-map');
    }

    return options;
  }
  
  /*
  minifyJsFile
  */
  
  minifyJsFile(source) {
    // Check this this is a javascript file and not already minimised
    if(source.substr(-2) != 'js' || source.substr(-6) == 'min.js') { return }
    
    var target = source.replace('.js', '.min.js');
    
    // Has the user asked to change the destination of the minimized files?
    var path_find          = nova.workspace.config.get('VineCode.JsMin.findInPath');
    var path_replace       = nova.workspace.config.get('VineCode.JsMin.replaceInPath');
    
    if( path_find && path_find.length && path_replace && path_replace.length )
    {   // Paths must end in a / to avoid replacing a partial dir name (e.g., path/js could trigger replace on path/js_min)
        if( path_find.substr(-1) !== '/' )
           path_find += '/';
        if( path_replace.substr(-1) !== '/' )
           path_replace += '/';
        
        var target = target.replace( path_find, path_replace );
        this.confirmPathExists( target );   // Make sure the parent of the target exists.
    }
    
    var args = this.getArgs;
        args.push("--output");
        args.push(target);
        args.push("--");
        args.push(source);
    
    this.processStart( args );
  }
  
  /*
  confirmPathExists
  
  Given a path to a file (that's about to be created), strip off the file name and make sure every
  directory up to that point exists.
  */
  
  confirmPathExists( path ){
    var path_parts = path.split('/');
        path_parts.pop();
    
    path = path_parts.join('/');
    
    var args = ['mkdir','-p', path];

    this.processStart( args );
  }
  
  /*
  Minify the current file
  */
  
  minifyJsFileOnSave(editor) {
    // Only minify if Auto Minify on save is enabled.
    var minifyOnSave  = nova.workspace.config.get('VineCode.JsMin.minifyOnSave');
    
    if( minifyOnSave == 'Yes')
      this.minifyJsFile( editor.document.path );
  }

  /*
  Minify the current file
  */
  
  minifyJsFileOnCommand(editor) {
    var source   = editor.document.path;
    
    if(source.substr(-2) != 'js' || source.substr(-6) == 'min.js') { return }

    console.log("minifyJsFileOnCommand");
    
    // Save any unsaved changes
    if(editor.document.isDirty) {
      console.log("Saving Changes");
      editor.save();
      
      // If we are minifying-on-save, the line above will trigger minifying and we should return.
      var minifyOnSave  = nova.workspace.config.get('VineCode.JsMin.minifyOnSave');
    
      if(minifyOnSave == 'Yes')
        return;
    }
    
    // Otherwise we must trigger minifying the file manually.
    this.minifyJsFile(source);
    
    return;
  }
  
  /*
  Beautify the current file
  */

  beautifyJsFileOnCommand(editor) {
    
    var source   = editor.document.path;
    
    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'js') { return }

    console.log("beautifyJsFile");
    
    // Save any unsaved changes
    if(editor.document.isDirty) {
      console.log("Saving Changes");
      // Can we stop this from triggering
      // the minify ?
      editor.save();
    }
    
    var execPath  = nova.workspace.config.get('VineCode.JsMin.execPath');
    
    if(!execPath) {
      execPath = 'uglifyjs';
    }
    
    var args = new Array;
        args.push(execPath);
        args.push("--beautify");
        args.push("--comments");
        args.push("all");
        args.push("--output");
        args.push(source);
        args.push("--");
        args.push(source);
        
    this.processStart( args );
  }
  
  /*
  processStart
  
  Generalized process launcher.
  */
  
  processStart( args )
  {
    var options = { args: args };
    var process = new Process("/usr/bin/env", options);
    
    var stdOut = new Array;
    process.onStdout(function(line) {
      stdOut.push(line.trim());
    });
    
    var stdErr = new Array;
    process.onStderr(function(line) {
      stdErr.push(line.trim());
    });

    process.onDidExit(function() {
      
      if( stdOut.length )
        console.log('stdOut: ' + stdOut.join("\n"));
      
      if( stdErr.length ){
        
        console.log('stdErr: ' + stdErr.join("\n"));

        if(nova._notificationTimer) {
          clearTimeout(nova._notificationTimer);
        }
              
        var message = stdErr.splice(0, 2).join("\n");
   
        let request = new NotificationRequest("js-error");
        request.title = nova.localize("Javascript Compile Error");
        request.body = nova.localize(message);
        request.actions = [nova.localize("Dismiss")];
        let promise = nova.notifications.add(request);
    
        // hide the notification after 5 seconds
        nova._notificationTimer = setTimeout(function() {
          nova.notifications.cancel("js-error");
        }, 10000);

      } else {
        // Hide any notifications of the previous error
        nova.notifications.cancel("js-error");
      }

    });

    process.start();
  }
}

module.exports = JsMinService;
