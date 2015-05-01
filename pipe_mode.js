/*
 * pipe_mode.js - function implementations unique to pipe-separated files
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, CodeMirror, _showKeywords, _showHubNotice */

define(function (require, exports, module) {
    "use strict";

    var robot = require("./robot");

    function isSeparator(stream) {
        // Return true if the stream is currently in a separator
        var match = stream.match(/(^|\s)\|(\s|$)/);
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
                // space followed by pipe, then whitespace or EOL
                // This signals the end of a cell in a row
                if (stream.match(/\|(\s|$)/, false)) {
                    stream.backUp(1);
                    break;
                }
            }
        }
        return (stream.current().length > 0);
    }

    function newlineAndIndent(cm, pos) {
        // insert a newline, then match the indentation of the line
        var currentLine = cm.getLine(pos.line);
        var match = currentLine.match(/^([.|\s]+)/);
        if (match) {
            cm.replaceRange("\n" + match[0], pos);
        } else {
            cm.replaceRange("\n", pos);
        }

    }

    function onTab(cm, pos, state) {
        var currentLine = cm.getLine(pos.line);

        // maybe-possibly insert a pipe
        //
        // Pressing tab repeatedly inserts this:
        // "| " -> "| | " -> "| | ... | "
        //
        // if at EOL, and line ends with space-pipe, remove the space-pipe,
        // insert a newline, and match the leading characters of the line

        if (!autoIndent(cm, pos)) {
            // if we are at the end of the line and we're not
            // preceeded by a separator AND we're not in a table
            // header, insert a separator. Otherwise, trim the trailing
            // empty cell and move to the next line.
            var token = cm.getTokenAt(pos);
            if (token.type != "header" && token.type != "comment") {
                if (pos.ch == currentLine.length) { // cursor at eol
                    if (currentLine.match(/\.\.\. +\|\s*$/)) {
                        // continuation line
                        newlineAndIndent(cm, pos);
                        return;

                    } else if (currentLine.match(/ +\|\s*$/)) {
                        // trailing empty cell; remove it and go to
                        // the next line
                        var cursor = cm.getSearchCursor(/(\s+)\|\s*/, pos);
                        var match = cursor.findPrevious();
                        cursor.replace("");
                        newlineAndIndent(cm, pos);
                        return;

                    } else if (!currentLine.match(/ \|\s+$/)) {
                        if (currentLine.match(/ +$/)) {
                            // already trailing space, just add pipe-space
                            cm.replaceRange("| ", pos)
                        } else {
                            // no trailing space; add space-pipe-space
                            cm.replaceRange(" | ", pos);
                        }
                        return;
                    }
                }
            }
            // all else fails, try moving to the next column
            robot.moveToNextCell(cm, pos);
        }
    }

    function autoIndent(cm, pos) {
        // attempt to insert an appropriate number of leading
        // pipes and spaces on a line

        // FIXME: this code may be working too hard; in many cases
        // I probably should just insert whatever the previous
        // line has.

        var state = cm.getStateAfter(pos.line);
        var currentLine = cm.getLine(pos.line);

        if (currentLine === "" && typeof state != "undefined") {
            if (state.spaceSeparated()) {
                cm.replaceRange("    ", pos)
                return true;
            } else if (state.pipeSeparated()) {
                // blank line; insert "| "
                cm.replaceRange("| ", pos)
                return true;
            } else if (state.tabSeparated()) {
                cm.replaceRange("\t", pos)
                return true;
            }
        }

        if (currentLine.match(/^\|\s+$/)) {
            // one pipe and some spaces
            if (typeof state != "undefined") {
                if (state.isTestCasesTable() || state.isKeywordsTable()) {
                    // line begins with "| "; insert another space-pipe-space
                    cm.replaceRange("| | ",
                                    {line: pos.line, ch: 0},
                                    {line: pos.line, ch: currentLine.length});
                    return true;
                } else {
                    // not a testcase or keyword table; insert a continuation line
                    cm.replaceRange("| ... | ",
                                    {line: pos.line, ch: 0},
                                    {line: pos.line, ch: currentLine.length});
                    return true;
                }
            }
            return false;
        }
        if (currentLine.match(/^\|\s+\|\s+$/)) {
            if (state.isTestCasesTable() || state.isKeywordsTable()) {
                // insert a testcase / keyword continuation
                cm.replaceRange("| | ... | ",
                                {line: pos.line, ch: 0},
                                {line: pos.line, ch: currentLine.length});
                return true;
            }
            return false;
        }

        if (pos.line > 1 && pos.ch == 0 && currentLine.match(/^[^|]/)) {
            var prevLine = cm.getLine(pos.line-1);
            var match = prevLine.match(/[| .]+/);
            if (match) {
                // If we found a match, use what we found as the prefix
                // for this line
                cm.replaceRange(match[0], {line: pos.line, ch: 0});
                return true;
            }
        }
        return false;
    }

    exports.isSeparator = isSeparator;
    exports.eatCellContents = eatCellContents;
    exports.onTab = onTab;
})
