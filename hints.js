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

	// I really don't like the implementation of this. Classic case
	// of a quick hack getting out of control.
        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var state = cm.getStateAfter(pos.line);
        var cell = robot.get_current_cell(cm, pos);
        var hub_url = prefs.get("hub-url");
        var keyword_url = hub_url + "/api/keywords?pattern=^" + cell.text + "*"
        var cell_number = robot.get_current_cell_number(cm, pos);
        var i;
        var keywords;
	var meta;

        this.editor = editor;
        this.hints = [];
        this.cell = cell; 

        if (implicitChar === null) {

            // FIXME: this should be only the part of the cell 
            // leading up to the insertion cursor...
            this.match = cell.text;

            if (cell.text.match(/\[.*?/) && cell_number === 1) {
		// possible metadata
		if (state.isTestCasesTable()) {
		    meta = ["[Documentation]","[Tags]", "[Setup]", "[Teardown]", 
               		    "[Template]", "[Timeout]"];
		} else if (state.isKeywordsTable()) {
		    meta = ["[Documentation]", "[Arguments]", "[Return]", 
			    "[Teardown]", "[Timeout]"];
		} else {
		    meta = [];
		}

		// remove trailing ], in case it was added by the auto-brace-matcher
		// (or by the user...).
		var prefix = cell.text.replace(/\]$/g, "").toLowerCase();
		for (i = 0; i < meta.length; i++) {
		    if (meta[i].toLowerCase().indexOf(prefix) == 0) {
			this.hints.push(meta[i])
		    }
		}
                this.hints.sort();

            } else if (cell.text.match(/^\*+\s*/)) {
		// a potential table heading
		var tmp = cell.text.replace(/^\*+\s*/,'');
		var pattern = new RegExp("^" + tmp, 'i');
		var tables = ["Keywords", "Settings", "Test Cases", "Variables"]
		this.hints = [];
		for (i = 0; i < 4 ; i++) {
		    if (tables[i].match(pattern)) {
			this.hints.push("*** " + tables[i] + " ***");
		    };
		}

            } else if (state.isSettingsTable() && cell_number === 0) {
                var allowable = ["Library","Resource","Variables",
                                 "Documentation", "Metadata", 
                                 "Suite Setup", "Suite Teardown",
                                 "Suite Precondition", "Suite Postcondition",
                                 "Force Tags", "Default Tags",
                                 "Test Setup", "Test Teardown",
                                 "Test Precondition", "Test Postcondition",
                                 "Test Template", "Test Timeout"].sort()

                this.hints = [];
                var pattern = new RegExp("^" + cell.text + ".*", "i");
		for (i = 0; i < allowable.length; i++) {
                    if (allowable[i].match(pattern)) {
                        this.hints.push(allowable[i]);
                    }
                }

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
        // The hint may contain the library name surrounded
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
    };

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
