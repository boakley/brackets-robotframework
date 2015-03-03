/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true*/
/*global define, brackets, $, window, CSSLint, Mustache */

define(function (require, exports, module) {
    'use strict';

    var CodeInspection      = brackets.getModule("language/CodeInspection");
    var NodeDomain          = brackets.getModule("utils/NodeDomain");
    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils");
    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager");
    var ProjectManager      = brackets.getModule("project/ProjectManager");

    var rflintDomain = new NodeDomain("rflint", ExtensionUtils.getModulePath(module, "node/rflint-domain"));
    var response = null;
    var result = {errors: []};

    function init() {

        rflintDomain.on("stdout", function (e, data) {
            var lines = data.data.split("\n");
            var regex = /^(W|E):\s*(\d+),\s*(\d+):\s*(.*)/;
            var type;
            var match;
            var error;

            lines.forEach(function (line) {
                match = regex.exec(line);

                if (match) {
                    // N.B. brackets starts counting lines at zero, rflint
                    // starts at 1
                    var pos = {
                        line: parseInt(match[2], 10) - 1,
                        ch: parseInt(match[3], 10)
                    };

                    type = CodeInspection.Type.WARNING;
                    if (match[1] === "E") {
                        type = CodeInspection.Type.ERROR;
                    }
                    
                    error = {
                        pos: pos,
                        message: match[4],
                        type: type
                    };
                    
                    if (_isUniqueError(result.errors, error)) {
                        result.errors.push(error);
                    }
                } else {
                    // some other sort of output we didn't expect.
                    if (line.length > 0) {
                        var error = {
                            pos: {},
                            message: "unexpected output from rflint: " + line,
                            type: CodeInspection.Type.META
                        };
                        result.errors.push(error);
                    }
                }
            });
        });

        rflintDomain.on("stderr", function (e, data) {
            var error = {
                pos: {},
                message: data.data,
                type: CodeInspection.Type.ERROR
            };
            if (_isUniqueError(result.errors, error)) {
                result.errors.push(error);
            }
        });
                       
        rflintDomain.on("error", function (e, data) {
            response.resolve(result);
        });

        rflintDomain.on("exit", function (e, data) {
            response.resolve(result);
        });
    }

    function _isUniqueError(errors, new_error) {
        // return true if the given error is NOT in the given errors array
        var i;
        var this_error;
        for (i = 0; i < errors.length; i++) {
            this_error = result.errors[i];
            if (this_error.pos.line === new_error.pos.line &&
                this_error.pos.ch === new_error.pos.ch &&
                this_error.message === new_error.message &&
                this_error.type === new_error.type) {
                return false;
            }
        }
        return true;
    }

    function handleLintRequest(text, fullPath) {

        var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
        var rflint_command = _prefs.get("rflint-command").trim();

        // if the file is empty, don't do anything. (oddly, brackets seems
        // to run lint when you first create a brand new file)
        if (rflint_command.length === 0 || text.trim().length === 0) {
            // is this the proper way to cancel the request?
            response = new $.Deferred();
            response.resolve();
            return response.promise();
        }


        var cwd = ProjectManager.getProjectRoot().fullPath;

        // N.B. the command must be a string; it will be parsed into arguments
        // by the domain. No matter what other arguments the user may have
        // specified, we need to insist on --no-filenames and --format.
        var command = rflint_command +
            " --no-filenames" +
            " --format '{severity}: {linenumber}, {char}: {message} ({rulename})'";

        result = {errors: []};
        response = new $.Deferred();
        rflintDomain.exec("start", cwd, command, fullPath);

        return response.promise();

    }

    exports.handleLintRequest = handleLintRequest;
    exports.init = init;
});
