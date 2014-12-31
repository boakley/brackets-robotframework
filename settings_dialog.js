/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, window, CSSLint, Mustache */

define(function (require, exports, module) {
    'use strict';

    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager");
    var settingsTemplate = require("text!templates/settings-template.html");

    var prefs = PreferencesManager.getExtensionPrefs("robotframework");

    function setFormValues(prefs) {
        console.log("setting form values...");
	$("#run-command").val(prefs.get("run-command"));
	$("#rflint-command").val(prefs.get("rflint-command"));
        $("#rfhub-url").val(prefs.get("hub-url"));
    }

    function showSettingsDialog() {

        console.log("show_prefs_dialog...");
        var form_data = {
            "run-command": prefs.get("run-command"),
            "rflint-command": prefs.get("rflint-command")
        }
            
	var Dialogs = brackets.getModule("widgets/Dialogs");

	var template = Mustache.render(settingsTemplate, form_data);
	var dialog = Dialogs.showModalDialogUsingTemplate(template);

	$("button[data-button-id='defaults']").on("click", function (e) {
            e.stopPropagation();
            setFormValues(prefs);
        });

        setFormValues(prefs);

        dialog.done(function (buttonId) {
	    if (buttonId === "ok") {
		var $dialog = dialog.getElement();
		var run_command = $("#run-command", $dialog).val();
		var rflint_command = $("#rflint-command", $dialog).val();
                var rfhub_url = $("#rfhub-url", $dialog).val();
                prefs.set("run-command", run_command);
                prefs.set("rflint-command", rflint_command);
                prefs.set("hub-url", rfhub_url);
                prefs.save();
            }
        })
    }

    exports.showSettingsDialog = showSettingsDialog;
});
