/* 
   hints.js - provide hints for robotframework text files

   This depends on a web service to provide the hinting information.
   This module will use an url like "http://<service>/api/keywords?pattern
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */


define(function (require, exports, module) {
    'use strict';
  
    var CommandManager  = brackets.getModule("command/CommandManager");
    var LanguageManager = brackets.getModule("language/LanguageManager");
    var AppInit         = brackets.getModule("utils/AppInit");
    var CodeHintManager = brackets.getModule("editor/CodeHintManager");
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var EditorManager   = brackets.getModule("editor/EditorManager");
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var Menus           = brackets.getModule("command/Menus");

    var robot           = require("./robot");
    var argfile         = require("./argfile_mode");
    var hints           = require("./hints");
    var inlinedocs      = require("./inlinedocs");
    var search_keywords = require("./search_keywords");

    var TOGGLE_KEYWORDS_ID  = "bryanoakley.show-robot-keywords";
    var SELECT_STATEMENT_ID = "bryanoakley.select-statement";

    var robotMenu;

    var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
    _prefs.definePreference("hub-url", "string", "http://localhost:7070");

    function initializeExtraStyles() {
        // I want pipes to be fairly faint; instead of using a color,
        // we'll make it really opaque.  This seems to work fairly well,
        // though I need more real-world testing. Maybe this should be
        // a preference?
        var node = document.createElement("style");
        node.innerHTML = ".cm-cell-separator {opacity: 0.3;}";
        document.body.appendChild(node);
    }

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

    // Create a menu just for this extension. In general, extensions
    // should avoid such schenanigans, but I need a user-visible place
    // to hang some features and keyboard shortcuts.
    function initializeMenu() {
        robotMenu = Menus.addMenu("Robot", "robot", Menus.BEFORE, Menus.AppMenuBar.HELP_MENU);

        CommandManager.register("Select current statement", SELECT_STATEMENT_ID, 
                                robot.select_current_statement);
        robotMenu.addMenuItem(SELECT_STATEMENT_ID, 
                             [{key: "Ctrl-\\"}, 
                              {key: "Ctrl-\\", platform: "mac"}]);
        
        CommandManager.register("Search for keywords", TOGGLE_KEYWORDS_ID, 
                                search_keywords.toggleKeywordSearch);
        robotMenu.addMenuItem(TOGGLE_KEYWORDS_ID, 
                              [{key: "Ctrl-Alt-\\"}, 
                               {key: "Ctrl-Alt-\\", platform: "mac" }]);
    }

    function initializeCodemirror() {
        // All the codemirror stuff to make the mode work...
        var cm = brackets.getModule("thirdparty/CodeMirror2/lib/codemirror");
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
    }
    
    AppInit.appReady(function () {
        // the event is *not* fired for the initial document, so 
        // we have to call it directly at startup.
        $(DocumentManager).on("currentDocumentChange", initializeUI);
        initializeUI();

    });

    initializeExtraStyles();
    initializeMenu();
    initializeCodemirror();

    search_keywords.init();

    CodeHintManager.registerHintProvider(new hints.HintProvider(), ["robot"], 1);
    EditorManager.registerInlineDocsProvider(inlinedocs.inlineDocsProvider);


});
