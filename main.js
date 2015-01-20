/* 
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
    var MainViewManager = brackets.getModule("view/MainViewManager");

    var Menus           = brackets.getModule("command/Menus");
    var CodeInspection  = brackets.getModule("language/CodeInspection");

    var robot           = require("./robot");
    var argfile         = require("./argfile_mode");
    var hints           = require("./hints");
    var inlinedocs      = require("./inlinedocs");
    var search_keywords = require("./search_keywords");
    var runner          = require("./runner");
    var linter          = require("./lint");
    var rangefinder     = require("./rangefinder");
    var settings_dialog = require("./settings_dialog");

    var TOGGLE_KEYWORDS_ID  = "bryanoakley.show-robot-keywords";
    var TOGGLE_RUNNER_ID    = "bryanoakley.show-robot-runner";
    var SELECT_STATEMENT_ID = "bryanoakley.select-statement";
    var EDIT_SETTINGS_ID    = "bryanoakley.edit-robot-preferences";
    var RUN_ID              = "bryanoakley.run";

    var robotMenu;

    var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
    _prefs.definePreference("hub-url", "string", "http://localhost:7070");
    _prefs.definePreference("run-command", "string", "pybot --suite %SUITE tests");
    _prefs.definePreference("rflint-command", "string", "rflint");

    function initializeExtraStyles() {
        // I want pipes to be fairly faint; instead of using a color,
        // we'll make it really opaque.  This seems to work fairly well,
        // though I need more real-world testing. Maybe this should be
        // a preference?
        var node = document.createElement("style");
        node.innerHTML = ".cm-cell-separator {opacity: 0.3;}";
        document.body.appendChild(node);
    }

    function on_click(cm, e) {
        // handle triple-click events; this is how we begin support for
        // selecting cell contents with a triple-click
        var editor = EditorManager.getCurrentFullEditor();
        if (editor && editor.getModeForDocument() === "robot") {
            robot.on_click(cm, e)
        }
    }

    function initializeUI() {
        // This is not the right way to do this. For exmaple, if you 
        // open a file in a different mode then swith to robot mode,
        // this code won't fire. What's the right way to do this?


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

                // this is so we can do something special for triple-clicks
                cm.on("mousedown", on_click);
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
        CommandManager.register("Show keyword search window", TOGGLE_KEYWORDS_ID, 
                                search_keywords.toggleKeywordSearch);
        CommandManager.register("Show runner window", TOGGLE_RUNNER_ID, 
                                runner.toggleRunner);
        CommandManager.register("Run test suite", RUN_ID,
                                runner.runSuite)
        CommandManager.register("Robot Settings ...", EDIT_SETTINGS_ID,
                                settings_dialog.showSettingsDialog);
        robotMenu.addMenuItem(SELECT_STATEMENT_ID, 
                             [{key: "Ctrl-\\"}, 
                              {key: "Ctrl-\\", platform: "mac"}]);
        
        robotMenu.addMenuDivider();

        robotMenu.addMenuItem(RUN_ID,
                              [{key: "Ctrl-R"},
                               {key: "Ctrl-R", platform: "mac"},
                              ]);

        robotMenu.addMenuDivider();

        robotMenu.addMenuItem(TOGGLE_KEYWORDS_ID, 
                              [{key: "Ctrl-Alt-\\"}, 
                               {key: "Ctrl-Alt-\\", platform: "mac" }]);
        robotMenu.addMenuItem(TOGGLE_RUNNER_ID,
                              [{key: "Alt-R"},
                               {key: "Alt-R", platform: "mac"},
                              ]);

        robotMenu.addMenuDivider();
        robotMenu.addMenuItem(EDIT_SETTINGS_ID);

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
        cm.registerHelper("fold", "robot", rangefinder.rangeFinder);

        LanguageManager.defineLanguage("robot", {
            name: "Robot",
            mode: "robot",
            fileExtensions: ["robot"],
            lineComment: ["#"]
        });
    }
    
    AppInit.appReady(function () {
        $(MainViewManager).on("currentFileChange", initializeUI);
        // the event is *not* fired for the initial document, so 
        // we have to call it directly at startup.
        // N.B. this used to be true prior to brackets 1.0; maybe
        // it's not true now? I need to do more testing...
//        initializeUI();

    });

    initializeExtraStyles();
    initializeMenu();
    initializeCodemirror();

    search_keywords.init();
    runner.init();
    linter.init();

    CodeHintManager.registerHintProvider(new hints.HintProvider(), ["robot"], 1);
    EditorManager.registerInlineDocsProvider(inlinedocs.inlineDocsProvider);
    CodeInspection.register("robot", {
        name: "robotframework-lint",
        scanFileAsync: linter.handleLintRequest
    });

});
