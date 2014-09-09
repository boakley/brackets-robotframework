/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var heading_pattern = /^\s*\*+\s*(settings?|metadata|variables?|test( cases?)?|(user )?keywords?)[ *]*$/i;

    function rangeFinder(cm, start) {
        // find ranges that can be folded -- sections (settings, varibles,
        // etc), keyword definitions and test case definitions

        // FIXME: stop at the last non-blank line of a block rather than the first
        // line of the next block
        var startLine = cm.getLine(start.line);
        var lastLine;
        var curLine;
        var endPattern = null;
        var state = cm.getStateAfter(start.line);
        var pos;
        var first_cell_pattern = /^\|\s+[^|\s]/i;
        var result;
        var i;
        var end;

        if (startLine.match(heading_pattern)) {
            // Found a heading? Everything up to the next heading or EOF
            // is foldable region
            endPattern = heading_pattern;
            pos = _find_end_of_section(cm, start.line);
            result = {
                from: {line: start.line, ch: startLine.length},
                to: pos};
            return result;
        }

        if ((state.table_name === "test_cases" ||
                    state.table_name === "keywords") &&
                   startLine.match(first_cell_pattern)) {
            // The beginning of a test case or keyword? Fold up to
            // the next test case, keyword, or heading (though,
            // we actually go to a line that is _probably_ a heading
            // to keep the pattern short)
            endPattern = new RegExp(/^\|\s+[^\|]|^\s*\*+/);

        } else {
            // the current line is not a valid fold point...
            return false;
        }

        // scan the following lines looking for the end pattern
        for (i = start.line + 1, end = cm.lineCount(); i < end; ++i) {
            curLine = cm.getLine(i);
            if (curLine.match(endPattern)) {
                result={
                    from: {line: start.line, ch: startLine.length},
                    to: {line: i-1, ch: curLine.length}
                };
                return result;
            };
        };
        // if we fell through the loop, fold to the end of the file
        lastLine = cm.getLine(cm.lineCount()-1)
        return {from: {line: start.line, ch: startLine.length},
                to: {line: cm.lineCount(), ch: lastLine.length}}
    }

    function _find_end_of_section(cm, linenumber) {
        // find the end of the current section, which is
        // either just before the start of the next section
        // or EOL

        var i, end, result, curLine;
        var start = linenumber;

        result = null;
        cm.eachLine(linenumber+1, cm.lineCount(), function(line) {
            if (line.text.match(heading_pattern)) {
                result = {line: line.lineNo() - 1, ch: line.text.length};
                return result;
            };
        });

        if (!result) {
            curLine = cm.getLine(cm.lastLine());
            result = {line: cm.lastLine(), ch: curLine.length};
        }
        return result;
    }
        
    exports.rangeFinder = rangeFinder;

})


