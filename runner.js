/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    'use strict';

    var CommandManager      = brackets.getModule("command/CommandManager");
    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager");
    var NodeDomain          = brackets.getModule("utils/NodeDomain");
    var ExtensionUtils      = brackets.getModule("utils/ExtensionUtils");
    var WorkspaceManager    = brackets.getModule('view/WorkspaceManager');
    var EditorManager       = brackets.getModule("editor/EditorManager");
    var PanelManager        = brackets.getModule("view/PanelManager");
    var ProjectManager      = brackets.getModule("project/ProjectManager");
    var DocumentManager     = brackets.getModule("document/DocumentManager");

    var robotDomain = new NodeDomain("robot", ExtensionUtils.getModulePath(module, "node/robot-domain"));
    // stolen from Brackets Builder
    var panelHTML = require('text!templates/runner-panel.html');
    var panel;
    var prefs;
    var $commandField,
        $actionButton;
    var actionCallback = null;

    var $panel = $("#robot-runner-panel");

    var TOGGLE_RUNNER_ID    = "bryanoakley.show-robot-runner";

    function init() {

        prefs = PreferencesManager.getExtensionPrefs("robotframework");
        var default_command = prefs.get("run-command");

        ExtensionUtils.loadStyleSheet(module, "runner.css");

        panel = WorkspaceManager.createBottomPanel("robot-runner-panel", $(panelHTML), 100);
        panel.hide();

        var $runnerPanel, $runnerContent;

        $runnerPanel = $("#robot-runner-panel");
        $runnerContent = $runnerPanel.find(".resizable-content");
        $commandField = $runnerPanel.find(".toolbar .command");
        $actionButton = $runnerPanel.find(".toolbar #action_button");

        _setAction(runSuite);
        $commandField.val(default_command);

        $runnerPanel.find(".close").click(function () {
            CommandManager.execute(TOGGLE_RUNNER_ID);
        });

        $actionButton.click(function() {
            actionCallback();
        })

        $runnerPanel.find(".command").keypress(function(event) {
            if (event.keyCode === 13) {
                runSuite();
            }
        });

        $(robotDomain).on("stdout", function(e, data) {
            var s = data.data;

            // convert log and report to hyperlinks
            var match = s.match(/(?:Log|Report|Output):\s*(.*.(?:html|xml))/m);
            if (match) {
                s = s.replace(match[1], '<a href="file://' + match[1] + '">' + match[1] + "</a>");
            }

            // FIXME: this can fall down if we only get half of the word
            // due to buffering. I think I need to use a different technique,
            // such as replacing escape sequences on the whole div after
            // each update
            s = s.replace("PASS", "<span class=status-pass>PASS</span>");
            s = s.replace("FAIL", "<span class=status-fail>FAIL</span>");
            s = s.replace("WARN", "<span class=status-warn>WARN</span>");

            $runnerContent.append(s);

            // FIXME: only scroll if the bottom of the area is visible.
            // But, how do I determine that. More to learn about javascript, I have. 
            $runnerContent.scrollTop($runnerContent.prop("scrollHeight"));
        });

        $(robotDomain).on("stderr", function(e, data) {
            $runnerContent.append("<br><span class='stderr'>" + data.data + "</span>");
            $runnerContent.scrollTop($runnerContent.prop("scrollHeight"));
        });

        $(robotDomain).on("exit", function(e, data) {
            _setAction(runSuite);
        });

    }

    // Show the runner panel if hidden, or hide if shown
    function toggleRunner(stealFocus) {
        if (panel.isVisible()) {
            panel.hide();
            CommandManager.get(TOGGLE_RUNNER_ID).setChecked(false);
            EditorManager.focusEditor();

        } else {
            stealFocus = typeof(stealFocus) === 'undefined' ? true : false;

            CommandManager.get(TOGGLE_RUNNER_ID).setChecked(true);
            panel.show();
            if (stealFocus) {
                $commandField.focus();
            }
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

    function stopSuite() {
        robotDomain.exec("stop");
        _setAction(runSuite)
    }

    function _setAction(callback) {
        actionCallback = callback;
        if (callback === runSuite) {
            $actionButton.text("Run");
            $actionButton.attr("title", "Run the command");
        } else {
            $actionButton.text("Stop");
            $actionButton.attr("title", "Stop the command");
        }
    }

    // Do the actual work of running the command
    function runSuite() {
        if (!panel.isVisible()) {
            toggleRunner(false);
        }
        _setAction(stopSuite)

        var current_suite = _getCurrentSuite();
        var command = $commandField.val();
        var label = "Run";
        prefs.set("run-command", command);
        prefs.save();

        if (current_suite && command) {
            command = command.replace(/%SUITE/, current_suite);
        }

        var projectRoot = ProjectManager.getProjectRoot();

        $("#robot-runner-panel").find(".resizable-content").html("");

        robotDomain.exec("start", projectRoot.fullPath, command);
    }

    exports.init = init;
    exports.runSuite = runSuite;
    exports.stopSuite = stopSuite;
    exports.toggleRunner = toggleRunner;
});
