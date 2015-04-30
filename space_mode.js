/*
 * space_mode.js - function implementations unique to space-separated files
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, CodeMirror, _showKeywords, _showHubNotice */

define(function (require, exports, module) {
    "use strict";

    var PreferencesManager  = brackets.getModule("preferences/PreferencesManager");
    var _prefs = PreferencesManager.getExtensionPrefs("robotframework");
    var separator_width = _prefs.get("separator-width");

    function isSeparator(stream) {
        // Return true if the stream is currently in a separator
        var match = stream.match(/(\s{2,})/);
        return match;
    }

    function eatCellContents(stream, state) {
        // gobble up characters until the end of the line or we find a separator

        var ch;

        while ((ch = stream.next()) != null) {
            if (ch === "\\") {
                // escaped character; gobble up the following character
                stream.next();

            } else if (ch == " ") {
                if (stream.match(/\s/, false)) {
                    stream.backUp(1);
                    break;
                }
            }
        }
        return (stream.current().length > 0);
    }

    function newline_and_indent(cm, pos) {
        // insert a newline, then match the indentation of the previous line
        var currentLine = cm.getLine(pos.line);
        var match = currentLine.match(/^([.|\s]+)/);
        if (match) {
            cm.replaceRange("\n" + match[0], pos);
        } else {
            cm.replaceRange("\n", pos);
        }
    }

    function auto_indent(cm, pos) {
        var state = cm.getStateAfter(pos.line);
//        var sep = new Array(separator_width+1).join("x");
//        console.log("separator: '" + sep + "'")

        if (typeof state === "undefined") {
            return false;
        }

        var currentLine = cm.getLine(pos.line);
        if (currentLine === "") {
            // blank line -> "| "
            cm.replaceRange("| ", pos)
            return true;
        }

        if (currentLine.match(/^\|\s*$/)) {
            if (state.isTestCasesTable() || state.isKeywordsTable()) {
                // multi-column table
                cm.replaceRange("| | ",
                                {line: pos.line, ch: 0},
                                {line: pos.line, ch: currentLine.length});
                return true;
            } else {
                // two-column table, so in sert a continuation
                cm.replaceRange("| ... | ",
                                {line: pos.line, ch: 0},
                                {line: pos.line, ch: currentLine.length});
                return true;
            }
            return false;
        }

        if (currentLine.match(/^\|\s+\|\s+$/)) {
            if (state.isTestCasesTable() || state.isKeywordsTable()) {
                // multi-column table; insert continuation
                cm.replaceRange("| | ... | ",
                                {line: pos.line, ch: 0},
                                {line: pos.line, ch: currentLine.length});
                return true;
            }
            // return here, or no?
//            return false;
        }

        // if all else fails, match the previous line
//        if (pos.line > 1 && pos.ch == 0 && currentLine.match(/^[^|]/)) {
            var prevLine = cm.getLine(pos.line-1);
            var match = prevLine.match(/[| .]+/);
            if (match) {
                // If we found a match, use what we found as the prefix
                // for this line
                cm.replaceRange(match[0], {line: pos.line, ch: 0});
                return true;
            }
//        }
        return false;
    }

    exports.isSeparator = isSeparator;
    exports.eatCellContents = eatCellContents;
    exports.newline_and_indent = newline_and_indent;
    exports.auto_indent = auto_indent;
})
