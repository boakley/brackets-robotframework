// This defines a hintProvider for robotframework files
//

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
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

    HintProvider.prototype.insertHintOnTab = true;

    HintProvider.prototype.hasHints = function (editor, implicitChar) {

        this.editor = editor;
        this.looking_for = null;

        var cm = editor._codeMirror;
        var pos = editor.getCursorPos();
        var tmp;
        var cell;
        var state = cm.getStateAfter(pos.line);
        // FIXME? do I need to compute cell_number when I already
        // have state.column?
        var cell_number = robot.get_current_cell_number(cm, pos);

        if (implicitChar === "*") {
            // is it a table heading?
            tmp = cm.getRange({line: pos.line, ch: 0}, pos);
            if (tmp.match(/^\*+/)) {
                return true;
            }

        } else if (implicitChar === "v") {
            // If user types "vv" (but not in the middle of a word),
            // replace with ${} and treat it as such. This is probably
            // the wrong place for such shenanigans, but whatever. 
            tmp = cm.getRange({line: pos.line, ch: pos.ch - 3},
                              {line: pos.line, ch: pos.ch - 1});
            if (tmp.match(/\bv$/)) {
                cm.replaceRange('${}', {line: pos.line, ch: pos.ch - 2}, pos);
                cm.setCursor({line: pos.line, ch: pos.ch});
                this.looking_for = "variable";
                return true;
            }

        } else if (implicitChar === "{") {
            tmp = cm.getRange({line: pos.line, ch: pos.ch - 2},  pos);
            if (tmp === "${") {
                return true;
            }

        } else if (implicitChar === "[") {
            // only provide metadata hints if the cursor is in the first cell
            // of a testcase or keyword
            if ((state.isTestCasesTable() || state.isKeywordsTable()) && cell_number === 1) {
                return true;
            }

        } else if (state.isSettingsTable() && cell_number === 0 && pos.ch !== 0) {
            // first column of a settings table, we always have hints.
            // Note that if the user prefers space-separated format we want
            // to NOT do that check on pos.ch; When I get around to finishing
            // support for space-separated format I can check for a setting
            // or something....
            return true;
        }

        if (implicitChar === null) {
            return true;
        }
        return false;
    };

    HintProvider.prototype.getHints = function (implicitChar) {
        var cm = this.editor._codeMirror;
        var pos = this.editor.getCursorPos();
        var state = cm.getStateAfter(pos.line);
        var cell = robot.get_current_cell(cm, pos);
        var cell_number = robot.get_current_cell_number(cm, pos);
        var match = "";
        var hints;

        // replace leading and trailing whitespace
        cell.text = cell.text.replace(/^ +| +$/g,'');

        // save it; we're gonna need it later.
        this.cell = cell;

        if (cell.text.match(/^\s*\[/)) {
            // metadata
            match = cell.text.replace(/^\s*\[|\]\s*$/g, "");
            hints = get_metadata_hints(match, state);
            return {hints: hints, match: match, selectInitial: true};

        } else if (cell.text.match(/\s*\$\{/)) {
            // variables
            // FIXME: either remove the current cell from the list,
            // or make it the first item in the list
            var matches = get_valid_variables(this.editor, pos);
            matches = matches.filter(function (item, index, inputArray) {
                // filter the list by only using matches that contain
                // the current cell text (minus the ${ and })
                var itemname = item.replace(/^\$\{|\}$/g, "");
                var match = cell.text.replace(/^\$\{|\}$/g, "");
                var result = (itemname.toLowerCase().indexOf(match.toLowerCase()) === 0);
                return result;
            });
            hints = make_ordered_set(matches);
            return {hints: hints, match: match, selectInitial: true};

        } else if (cell.text.match(/\*+/) && cell.start.ch === 0) {
            // table headings
            match = cell.text.replace(/^\*+\s*|\*\s*/, '');

            hints = get_heading_hints(match);
            return {hints: hints, match: match, selectInitial: true};
            
        } else if (state.isSettingsTable() && cell_number === 0) {
            // settings
            hints = get_settings_hints(cell.text);
            return {hints: hints, match: cell.text, selectInitial: true};
            
        } else {

            // ok, done with all the special cases. What's left might be a keyword
            // FIXME: move fetching keyword data to a function,
            // and give the function the ability to add a status
            // indicator to the statusbar if the hub is down

            var hub_url = prefs.get("hub-url");
            var keyword_url = hub_url + "/api/keywords?pattern=^" + cell.text + "*";

            var keywords = get_local_keywords(this.editor, cell.text);

            $.ajaxSetup({ "async": false});
            // We should be able to catch errors via .fail, but
            // we need to work around a bug in jquery.
            // See http://bugs.jquery.com/ticket/14683
            try {
                var response = $.getJSON(keyword_url, function (data) {
                    var i;
                    StatusBar.updateIndicator("rfhub-error", false);
                    for (i = 0; i < data.keywords.length; i++) {
                        keywords.push(data.keywords[i].name + "<i>&nbsp;(" + data.keywords[i].library + ")</i>");
                        
                        //                            keywords.push({library: data.keywords[i].library,
                        //                                         keyword: data.keywords[i].name})
                        
                    }
                }).fail(function (jqxhr, textStatus, error) {
                    StatusBar.updateIndicator("rfhub-error", true);
                });

            } catch (err) {
                StatusBar.updateIndicator("rfhub-error", true);
            }

            $.ajaxSetup({ "async": true});
            return {hints: keywords.sort(), match: cell.text, selectInitial: true};
        }
    };

    HintProvider.prototype.insertHint = function (hint) {
        // The hint may contain the library name surrounded
        // by <i></i>, which needs to be stripped off
        hint = hint.replace(/<i>.*<\/i>/, "");

        var cm = this.editor._codeMirror;
        var state = cm.getStateAfter(this.cell.start.line);
        var currentLine = cm.getLine(this.cell.start.line);

        // this next piece of magic should probably be configurable
        // by the user - let's auto-add a separator. I think it's
        // the Right Thing to do more often than not.
        if (hint.match(/^\*/)) {
            // a heading
            hint += "\n";
        } else if (this.cell.end.ch === currentLine.length) {
            // ie: nothing follows this cell
            if (state.separator == "pipes") {
                hint += " | ";
            }
        }
        
        this.editor.document.replaceRange(hint, this.cell.start, this.cell.end);

        return false;
    };

    // this function is supposed to return a list of variables 
    // visible at the current position. What it actually does
    // is return all variables mentioned in the file. Not
    // ideal, but it's a good starting place.
    function get_valid_variables(editor, pos) {
        var matches = editor.document.getText().match(/\$\{.*?\}/g);
        return matches;
    }
    
    function get_settings_hints(prefix) {
        // I hate hard-coding these. I wish robot had an API I could use
        // to fetch them. 
        var allowable = [
            "...",
            "Library", "Resource", "Variables",
            "Documentation", "Metadata",
            "Suite Setup", "Suite Teardown",
            "Suite Precondition", "Suite Postcondition",
            "Force Tags", "Default Tags",
            "Test Setup", "Test Teardown",
            "Test Precondition", "Test Postcondition",
            "Test Template", "Test Timeout"].sort();
        var i;
        var hints = [];

        if (prefix.match(/^\s*$/)) {
            return allowable;
        }
        prefix = prefix.toLowerCase().replace(/^\s+/, "");
        for (i = 0; i < allowable.length; i++) {
            if (allowable[i].toLowerCase().indexOf(prefix) === 0) {
                hints.push(allowable[i]);
            }
        }
        return hints;
    }

    function get_metadata_hints(prefix, state) {
        var meta = [];
        var hints = [];
        var i;
        if (state.isTestCasesTable()) {
            // "..." is also valid in this context even though it's not
            // metadata per se.
            meta = ["...", "[Documentation]", "[Tags]", "[Setup]", "[Teardown]",
                    "[Template]", "[Timeout]"];
        } else if (state.isKeywordsTable()) {
            meta = ["...", "[Documentation]", "[Arguments]", "[Return]",
                    "[Teardown]", "[Timeout]"];
        }

        prefix = "[" + prefix.toLowerCase();
        for (i = 0; i < meta.length; i++) {
            if (meta[i].toLowerCase().indexOf(prefix) === 0) {
                hints.push(meta[i]);
            }
        }
        return hints.sort();
    }

    function escape_regex_chars(str) {
        // escape characters special to regex; eg * becomes \*
        return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, "\\$&");
    }

    function get_heading_hints(prefix) {
        // Return all possible table headings matching the prefix

        var pattern = new RegExp("^" + escape_regex_chars(prefix), 'i');
        var tables = ["Keywords", "Settings", "Test Cases", "Variables"];
        var hints = [];
        var i;
        for (i = 0; i < 4; i++) {
            if (tables[i].match(pattern)) {
                hints.push("*** " + tables[i] + " ***");
            }
        }
        return hints;
    }

    // Return a list of local keywords that start with the given pattern
    // Performance note: a quick test showed this to take <10 milliseconds
    // to scan a file of 6000 lines containing 500 keywords. Not too shabby!
    function get_local_keywords(editor, _pattern) {
        // this assumes all of the text has been parsed by codemirror. That
        // may not always be true. I need to figure out how to get codemirror
        // to tokenize the whole file...

        var cm = editor._codeMirror,
            line,
            state,
            keywords = [],
            pattern = _pattern.toLowerCase();

        cm.eachLine(function (line) {
            state = line.stateAfter;
            if (state && state.isKeywordsTable() && state.tc_or_kw_name) {
                if (state.tc_or_kw_name.toLowerCase().indexOf(pattern) === 0) {
                    if (keywords.indexOf(state.tc_or_kw_name) === -1) {
                        keywords.push(state.tc_or_kw_name);
                    }
                }
            }
        });

        return keywords;
    }

    function make_ordered_set(array) {
        // remove duplicates, and do case-insensitive sort
        array = array.filter(function (item, index, inputArray) {
            return inputArray.indexOf(item) === index;
        });

        array = array.sort(function (a, b) {
            if (a.toLowerCase() < b.toLowerCase()) { return -1; }
            if (a.toLowerCase() > b.toLowerCase()) { return 1; }
            return 0;
        });

        return array;
    }
    
    exports.HintProvider = HintProvider;
});
