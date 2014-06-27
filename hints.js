// This defines a hintProvider for robotframework files
//

define(function(require, exports, module) {
    'use strict';

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var StatusBar = brackets.getModule("widgets/StatusBar");
    var prefs = PreferencesManager.getExtensionPrefs("robotframework");
    var robot = require("./robot");

    function HintProvider() {
        // these will be set in hasHints, and used in 
        // getHints and insertHint:
        this.hints = []; 
        this.match = "";
        this.cell = null; 
        this.editor = null;

        var $msg = $("<div><~></div>");
        StatusBar.addIndicator("rfhub-error", $msg, false, "", 
                               "Robot framework hub is unreachable. Robot autocomplete is unavailable. See https://github.com/boakley/robotframework-hub");
    }

    HintProvider.prototype.hasHints = function(editor, implicitChar) {

        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var linestart = {line: pos.line, ch: 0};
        var state = cm.getStateAfter(pos.line);
        var cell = robot.get_current_cell(cm, pos);
        var hub_url = prefs.get("hub-url");
        var keyword_url = hub_url + "/api/keywords?pattern=^" + cell.text + "*"
        var i;
        var keywords;

        this.editor = editor;
        this.hints = [];
        this.cell = cell; 

        if (implicitChar === null) {

            // FIXME: this should be only the part of the cell 
            // leading up to the insertion cursor...
            this.match = cell.text;

            if (cell.text.match(/\[.*?\]/)) {
		// metadata
		if (state.isTestCasesTable()) {
                    this.hints = ["[Documentation]","[Tags]", "[Setup]", "[Teardown]", 
				  "[Template]", "[Timeout]"]
		} else if (state.isSettingsTable()) {
                    this.hints = ["[Default Tags]", "[Force Tags]", "[Test Setup]", 
				  "[Test Teardown]", "[Test Template]", "[Test Timeout]"]
		}
                this.hints.sort();

            } else if (cell.text.match(/^\*+/)) {
		// a heading
		this.hints = ["*** Test Cases ***", 
			      "*** Settings ***",
			      "*** Keywords ***",
			      "*** Variables ***"].sort();


	    } else {
		// likely a keyword

		// FIXME: move fetching keyword data to a function,
		// and give the function the ability to add a status
		// indicator to the statusbar if the hub is down
		$.ajaxSetup({ "async": false});
		keywords = []
		// We should be able to catch errors via .fail, but
		// we need to work around a bug in jquery.
		// See http://bugs.jquery.com/ticket/14683
		try {
                    var response = $.getJSON(keyword_url, function(data) {
			StatusBar.updateIndicator("rfhub-error", false)
			for (i = 0; i < data.keywords.length; i++) {
			    keywords.push(data.keywords[i].name + "<i>&nbsp;(" + data.keywords[i].library + ")</i>")
					  
//                            keywords.push({library: data.keywords[i].library,
//					   keyword: data.keywords[i].name})
					 
			}
                    }).fail(function(jqxhr, textStatus, error) {
			StatusBar.updateIndicator("rfhub-error", true)
                    })
		} 
		catch(err) {
                    StatusBar.updateIndicator("rfhub-error", true)
		}

		$.ajaxSetup({ "async": true});
		this.hints = keywords.sort();
	    }
            return this.hints.length > 0;
        }
        return false;
    };

    HintProvider.prototype.getHints = function(implicitChar) {
        return {hints: this.hints, match: this.match, selectInitial: true};
    };

    HintProvider.prototype.insertHint = function(hint) {
        // The hint will contain the library name surrounded
        // by <i></i>, which needs to be stripped off
        hint = hint.replace(/<i>.*<\/i>/,"");
        this.editor.document.replaceRange(hint, this.cell.start, this.cell.end);
        return false;
    };

    function get_local_keywords(editor) {
        // not implemented yet...
        for (var i = 0; i < editor.lineCount(); i++) {
            var line = editor.document.getLine(i);
        }
    }

    HintProvider.prototype._get_hints = function(state, prefix) {

        var escaped_prefix = prefix.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") ;
        var pattern = new RegExp("^" + escaped_prefix + ".*", "i");
        var hints = [];

        if (prefix.match(/\[.*?\]/)) {
            // metadata
            if (state.isTestCasesTable()) {
                hints = ["[Documentation]","[Tags]", "[Setup]", "[Teardown]", 
                         "[Template]", "[Timeout]"]
            } else if (state.isSettingsTable()) {
                hints = ["[Default Tags]", "[Force Tags]", "[Test Setup]", 
                         "[Test Teardown]", "[Test Template]", "[Test Timeout]"]
            }
        } else if (prefix.match(/^\*+/)) {
            // a heading
            hints = ["*** Test Cases ***", 
                     "*** Settings ***",
                     "*** Keywords ***",
                     "*** Variables ***"]
        } else {
	    console.log("***** WTF?", this.libraries)
            for (var i=0; i < this.libraries.length; i++) {
                var lib = this.libraries[i];
                var tmp = lib.keywords(pattern);
                this.libraries[i].keywords(pattern).map(function(item) {
                    if (hints.indexOf(item) == -1) {
                        hints.push(item);
                    }
                })
            }
        }
        return hints;
    }

    exports.HintProvider = HintProvider;
});
