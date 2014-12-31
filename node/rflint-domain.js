
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

/* 
   node domain for running robotframework-lint
*/

(function () {
    "use strict";
    
    var spawn = require('child_process').spawn;
    var parse = require('shell-quote').parse;

    var _domainManager;
    var child;
        
    function cmdStop() {
        child.kill('SIGTERM');
    }

    function cmdStart(cwd, command, path) {

        var argv = parse(command);
        var opts = {cwd: cwd};
        var message;

        if (argv.length === 0) {
            return false;
        }

        argv.push(path);

        child = spawn(argv[0], argv.slice(1), opts);

        child.stdout.on('data', function (data) {
            _domainManager.emitEvent("rflint", "stdout", {data: String(data)});
        });

        child.stderr.on('data', function (data) {
            _domainManager.emitEvent("rflint", "stderr", {data: String(data)});
        });

        child.on('error', function (err) {
            if (err.code === 'ENOENT') {
                message = "unable to run robotframework-lint: file not found: '" + argv[0] + "'";
                _domainManager.emitEvent("rflint", "stderr", {data: message});
            } else {
                message = "unexpected error when running robotframework-lint: " + err.message;
                _domainManager.emitEvent("rflint", "stderr", {data: message});
            }
            _domainManager.emitEvent("rflint", "error", {message: String(message)});
        });

        child.on('exit', function (code) {
            _domainManager.emitEvent("rflint", "exit", {statuscode: code});
        });

        return true;
    }

    function init(domainManager) {
        _domainManager = domainManager;

        if (!domainManager.hasDomain("rflint")) {
            domainManager.registerDomain("rflint", {major: 0, minor: 1});
        }

        domainManager.registerCommand(
            "rflint",       // domain name
            "start",        // command name
            cmdStart,       // command handler function
            true,           // this command is synchronous in Node
            "Runs rflint (robotframework-lint)",
            [{name: "folder",
              type: "string",
              description: "use this path as the cwd"
             },
             {name: "command",
              type: "array",
              description: "the command to run (can include arguments)"
             },
             {name: "path",
              type: "string",
              description: "the path to a file to be processed"
             }], // parameters
            [{name: "result", // return values
              type: "string",
              description: "random string"}]
        );

        domainManager.registerCommand(
            "rflint",
            "stop",
            cmdStop,
            true,
            "Sends SIGINT to the running process",
            [], // parameters,
            [{name: "result",
              type: "string",
              description: "terminates the running process"}]
        );

        domainManager.registerEvent(
            "rflint",
            "exit",
            [{
                name: "statuscode",
                type: "integer",
                description: "the status code"
            }]
        );
        domainManager.registerEvent("rflint", "kill");
        domainManager.registerEvent(
            "rflint",
            "stdout",
            [{
                name: "data",
                type: "string",
                description: "the data. duh."
            }]
        );
        domainManager.registerEvent(
            "rflint",
            "stderr",
            [{
                name: "data",
                type: "string",
                description: "the data. duh."
            }]

        );
        domainManager.registerEvent(
            "rflint",
            "error",
            [{
                name: "err",
                type: "object",
                description: "the error object"
            }]

        );
    }
    
    exports.init = init;
    
}());
