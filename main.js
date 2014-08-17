/* 
   hints.js - provide hints for robotframework text files

   This depends on a web service to provide the hinting information.
   This module will use an url like "http://<service>/api/keywords?pattern
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */


define(function (require, exports, module) {
    'use strict';
  
    var LanguageManager = brackets.getModule("language/LanguageManager");
    var AppInit         = brackets.getModule("utils/AppInit");
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var FileSystem      = brackets.getModule("filesystem/FileSystem");
    var FileUtils       = brackets.getModule("file/FileUtils");
    var CodeHintManager = brackets.getModule("editor/CodeHintManager");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var EditorManager   = brackets.getModule("editor/EditorManager");
    var DocumentManager = brackets.getModule("document/DocumentManager");

    var robot = require("./robot");
    var argfile = require("./argfile_mode");
    var Hints = require("./hints");
    var inlinedocs = require("./inlinedocs");

    var prefs = PreferencesManager.getExtensionPrefs("robotframework");
    var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
    _prefs.definePreference("hub-url", "string", "http://localhost:7070");

    // I want pipes to be fairly faint; instead of using a color,
    // we'll make it really opaque.  This seems to work fairly well,
    // though I need more real-world testing. Maybe this should be
    // a preference?
    var node = document.createElement("style");
    node.innerHTML = ".cm-cell-separator {opacity: 0.3;}";
    document.body.appendChild(node);

    function initializeUI() {
        // do some mode-specific initialization that can only be done after 
        // an editor has been instantiated.
        var editor = EditorManager.getCurrentFullEditor();

        if (editor && editor.getModeForDocument() === "robot") {
            var cm = editor ? editor._codeMirror : null;
            if (cm && (typeof editor.initialized === 'undefined' || !editor.initialized)) {
                // I should probably be using the brackets manager APIs to
                // do this...
                var extraKeys = cm.getOption('extraKeys');
                extraKeys.Tab = robot.on_tab;
                cm.addOverlay(robot.overlay_mode());
            }
        }
    }

    AppInit.appReady(function () {
        var DocumentManager = brackets.getModule("document/DocumentManager");

        // the event is *not* fired for the initial document, so 
        // we have to call it directly at startup.
        $(DocumentManager).on("currentDocumentChange", initializeUI);
        initializeUI();
    });

    // see https://github.com/adobe/brackets/wiki/New-Code-Hinting-API-Proposal
    CodeHintManager.registerHintProvider(new Hints.HintProvider(), ["robot"], 1);

    // register the inline help provider
    EditorManager.registerInlineDocsProvider(inlinedocs.inlineDocsProvider);

    var cm = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");

    // new mode for robot argument files
    cm.defineMode("robot_argfile", argfile.argfile_mode);
    cm.defineMIME("text/x-robot-args", "argfile");
    LanguageManager.defineLanguage("robot_argfile", {
        name: "robot_argfile",
        mode: "robot_argfile",
        fileExtensions: ["args"],
        lineComment: ["#"]
    });

    // the core robot mode
    cm.defineMode("robot-variable", robot.overlay_mode);
    cm.defineMode("robot", robot.base_mode);
    cm.defineMIME("text/x-robot", "robot");
    cm.registerHelper("fold", "robot", robot.rangeFinder);

    LanguageManager.defineLanguage("robot", {
        name: "robot",
        mode: "robot",
        fileExtensions: ["robot"],
        lineComment: ["#"]
    });

});
