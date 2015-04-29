/*
  rangefinder.js - module for managing code folding regions
*/

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    function rangeFinder(cm, start) {
        // find ranges that can be folded -- sections (settings, varibles,
        // etc), keyword definitions and test case definitions

        var startLine = cm.getLine(start.line);
        var state = cm.getStateAfter(start.line);
        var pos;
        var result;

        if (cm.getTokenTypeAt({line: start.line, ch: 1}) == "header") {
            // Found a heading? Everything up to the next heading or EOF
            // is a foldable region
            pos = findNextLineWithToken(cm, "header", start.line + 1);
            result = {
                from: {line: start.line, ch: startLine.length},
                to: pos};
            return result;
        }

        if ((state.table_name === "test_cases" || state.table_name === "keywords") &&
            isBlockStart(cm, start.line)) {

            pos = findNextLineWithToken(cm, "keyword", start.line + 1);
            result = {
                from: {line: start.line, ch: startLine.length},
                to: pos};
            return result;
        }
    }

    function isBlockStart(cm, linenumber) {
        // Return True if the given line is the beginning of a block
        // (read: keyword or test case)
        var tokens = cm.getLineTokens(linenumber);
        for (var i = 0; i < tokens.length; i++) {
            if (tokens[i].type === "keyword") {
                return true;
            }
        }
        return false;
    }

    function findNextLineWithToken(cm, token_type, start) {
        // Find the next line with the given token
        var tokens;
        var result = null;
        cm.eachLine(start+1, cm.lineCount(), function(line) {
            tokens = cm.getLineTokens(line.lineNo());
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].type === token_type) {
                    result = {line: line.lineNo() - 1, ch: line.text.length};
                    return result;
                }
            }
        });

        if (!result) {
            var lastLine = cm.getLine(cm.lastLine());
            var result = {line: cm.lastLine(), ch: lastLine.length};
        }
        return result;
    }
        
    exports.rangeFinder = rangeFinder;

})


