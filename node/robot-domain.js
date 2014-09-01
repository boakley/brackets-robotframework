/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *  
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"), 
 * to deal in the Software without restriction, including without limitation 
 * the rights to use, copy, modify, merge, publish, distribute, sublicense, 
 * and/or sell copies of the Software, and to permit persons to whom the 
 * Software is furnished to do so, subject to the following conditions:
 *  
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *  
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4,
maxerr: 50, node: true */
/*global */

(function () {
    "use strict";
    
    var os = require("os");
    var sys = require("sys");
    var exec = require('child_process').exec;
    var spawn = require('child_process').spawn;
    var parse = require('shell-quote').parse;
    var running = false;

    var _domainManager;
    var child;
        
    function cmdRunSuite(folder, command) {

        var argv = parse(command);
        var opts = {cwd: folder};

        if (argv.length === 0) {
            return false;
        }

        child = spawn(argv[0], argv.slice(1), opts);

        child.stderr.on('data', function(data) {
            _domainManager.emitEvent("robot", "stderr", {data: String(data)});
        });
        child.stdout.on('data', function(data) {
            _domainManager.emitEvent("robot", "stdout", {data: String(data)});
        });
        child.on('exit', function(code) {
            _domainManager.emitEvent("robot","exit", {statuscode: code});
        });

        return true;
    }

    /**
     * Initializes the test domain with several test commands.
     * @param {DomainManager} domainManager The DomainManager for the server
     */
    function init(domainManager) {
        _domainManager = domainManager;

        if (!domainManager.hasDomain("robot")) {
            domainManager.registerDomain("robot", {major: 0, minor: 1});
        }

        domainManager.registerCommand(
            "robot",        // domain name
            "runSuite",     // command name
            cmdRunSuite,    // command handler function
            true,          // this command is synchronous in Node
            "Runs a robot framework test suite",
            [{name: "folder",
              type: "string",
              description: "use this path as the cwd"
             },
             {name: "command",
              type: "string",
              description: "the command to run"
             }], // parameters
            [{name: "result", // return values
              type: "string",
              description: "random string"}]
        );

        domainManager.registerEvent(
            "robot",
            "exit",
            [{
                name: "statuscode",
                type: "integer",
                description: "the status code"
            }]
        );
        domainManager.registerEvent(
            "robot",
            "stdout",
            [{
                name: "data",
                type: "string",
                description: "the data. duh."
            }]
        );
        domainManager.registerEvent(
            "robot",
            "stderr",
            [{
                name: "data",
                type: "string",
                description: "the data. duh."
            }]

        );
    }
    
    exports.init = init;
    
}());
