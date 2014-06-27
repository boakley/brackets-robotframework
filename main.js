/* 
   hints.js - provide hints for robotframework text files

   This depends on a web service to provide the hinting information.
   This module will use an url like "http://<service>/api/keywords?pattern
*/

define(function (require, exports, module) {
    'use strict';
  
    var LanguageManager = brackets.getModule("language/LanguageManager");
    var AppInit         = brackets.getModule("utils/AppInit");
    var ExtensionUtils  = brackets.getModule("utils/ExtensionUtils");
    var FileSystem      = brackets.getModule("filesystem/FileSystem");
    var FileUtils       = brackets.getModule("file/FileUtils");
    var CodeHintManager = brackets.getModule("editor/CodeHintManager");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");

    var robot = require("./robot");
    var Hints = require("./hints");

    var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
    _prefs.definePreference("hub-url", "string", "http://localhost:7070");

    // I want pipes to be fairly faint; instead of using a color,
    // we'll make it really opaque.  This seems to work fairly well,
    // though I need more real-world testing. Maybe this should be
    // a preference?
    var node = document.createElement("style");
    node.innerHTML = ".cm-cell-separator {opacity: 0.3;}"
    document.body.appendChild(node);

    function initializeUI() {
        // do some mode-specific initialization that can only be done after 
        // an editor has been instantiated.
        var EditorManager   = brackets.getModule("editor/EditorManager");
        var DocumentManager = brackets.getModule("document/DocumentManager");
        var editor = EditorManager.getCurrentFullEditor()

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

    var cm = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror") ;

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
