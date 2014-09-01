/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    'use strict';

    var CommandManager      = brackets.getModule("command/CommandManager");
    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager");
    var NodeDomain          = brackets.getModule("utils/NodeDomain");
    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils");
    var PanelManager        = brackets.getModule("view/PanelManager");
    var EditorManager       = brackets.getModule("editor/EditorManager");
    var PanelManager        = brackets.getModule("view/PanelManager");
    var ProjectManager      = brackets.getModule("project/ProjectManager");
    var DocumentManager     = brackets.getModule("document/DocumentManager");

    var robotDomain = new NodeDomain("robot", ExtensionUtils.getModulePath(module, "node/robot-domain"));
    // stolen from Brackets Builder
    var panelHTML = require('text!templates/runner-panel.html');
    var panel;
    var prefs;
    var $commandField;

    var $panel = $("#robot-runner-panel");

    var TOGGLE_RUNNER_ID    = "bryanoakley.show-robot-runner";

    function init(prefs) {

        prefs = PreferencesManager.getExtensionPrefs("robotframework");
        var default_command = prefs.get("run-command");

        ExtensionUtils.loadStyleSheet(module, "runner.css");

        panel = PanelManager.createBottomPanel("robot-runner-panel", $(panelHTML), 100);
        panel.hide();

        var $runnerPanel, $runnerContent;

        $runnerPanel = $("#robot-runner-panel");
        $runnerContent = $runnerPanel.find(".resizable-content");
        $commandField = $runnerPanel.find(".toolbar .command");

        $commandField.val(default_command);

        $runnerPanel.find(".close").click(function () {
            CommandManager.execute(TOGGLE_RUNNER_ID);
        });

        $runnerPanel.find(".run").click(function() {
            runSuite();
        });

        $runnerPanel.find(".command").keypress(function(event) {
            if (event.keyCode === 13) {
                runSuite();
            }
        });

        $(robotDomain).on("stdout", function(e, data) {
            $("#robot-runner-panel").find(".resizable-content").append(data.data);
        });

        $(robotDomain).on("stderr", function(e, data) {
            $("#robot-runner-panel").find(".resizable-content").append("<b>"+data.data+"</b>");
        });

//        $(robotDomain).on("exit", function(e, data) {
//            // need to set some sort of status flag or icon or whatnot
//        });

    }

    // Show the runner panel if hidden, or hide if shown
    function toggleRunner(show) {
        if (panel.isVisible()) {
            panel.hide();
            CommandManager.get(TOGGLE_RUNNER_ID).setChecked(false);
            EditorManager.focusEditor();
        } else {
            CommandManager.get(TOGGLE_RUNNER_ID).setChecked(true);
            panel.show();
        }
        EditorManager.resizeEditor();
    }

    function _getCurrentSuite() {
        // the suite is just the name of the file sans suffix
        var doc = DocumentManager.getCurrentDocument();
        var suite = null;
        if (doc) {
            suite = doc.file.name.replace(/.robot$/,"");
        }
        return suite
    }

    // Do the actual work of running the command
    function runSuite() {
        if (!panel.isVisible()) {
            toggleRunner()
        }
        var current_suite = _getCurrentSuite();
        var command = $commandField.val();
        if (current_suite && command) {
            command = command.replace(/%SUITE/, current_suite);
        }

        var projectRoot = ProjectManager.getProjectRoot();

        $("#robot-runner-panel").find(".resizable-content").html("");

        robotDomain.exec("runSuite", projectRoot.fullPath, command)
        .done(function(s) {
            console.log("[brackets-robot-node] runSuite: %s", s);
        }).fail(function(err) {
            console.error("[brackets-robot-node] runSuite failed", err);
        });

    }

    exports.init = init;
    exports.runSuite = runSuite;
    exports.toggleRunner = toggleRunner;
});