// robot.js - editing mode for robotframework pipe-separated text format

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true, white: true*/
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    var EditorManager = brackets.getModule("editor/EditorManager");

    var mode = {
        pipes: require("./pipe_mode"),
        spaces: require("./space_mode")
    }

    function overlay_mode(config, parserConfig) {
        // This defines an overlay mode that matches robot
        // variables (eg: ${...}, %{...}, @{...})
        var var_prefix_regex = /[$%@]\{/;
        var overlay = {
            token: function (stream, state) {
                var c;
                var brace_count;
                if (stream.match(var_prefix_regex)) {
                    brace_count = 1;
                    while ((c = stream.next()) != null) {
                        if (c === "{") {
                            brace_count += 1;
                        } else if (c === "}") {
                            brace_count -= 1;
                            if (brace_count <= 0) {break; }
                        }
                    }
                    return "variable";
                }
                // skip to the next occurance of a variable
                while (stream.next() != null && !stream.match(var_prefix_regex, false)) {}
                return null;
            }
        };
        return overlay;
    }


    // this is the main mode for robot files
    function base_mode(config, parserConfig) {

        function canonicalTableName(name) {
            // This returns the canonical (internal) name for a table,
            // which will be one of "settings", "test_cases",
            // "keywords", or "variables"
            //
            // This function will return null if name isn't one of the
            // strings supported by robot
            name = name.trim().toLowerCase();
            if (name.match("settings?|metadata")) {return "settings"; }
            if (name.match("test ?cases?"))       {return "test_cases"; }
            if (name.match("(user )?keywords?"))  {return "keywords"; }
            if (name.match("variables?"))         {return "variables"; }
            return null;
        }

        function isHeading(stream, state) {
            // this matches things like "*** Test Cases ***", "*** Keywors ***", etc
            // It tries to strictly follow the robot specification, which implies you
            // can have more than one asterisk, and trailing asterisks are optional,
            // and the table names must be one of the recognized table names
            if (stream.sol()) {
                var match = stream.match(/^\s*\*+\s*(settings?|metadata|variables?|test ?cases?|(user )?keywords?)[ *]*$/i);
                if (match !== null) {
                    state.table_name = canonicalTableName(match[1]);
                    state.tc_or_kw_name = null;
                    stream.skipToEnd();
                    return true;
                }
            }
            return false;
        }

        function isContinuation(stream, state) {
            // Return true if the stream is currently in a
            // continuation cell
            return (state.column === 1 && stream.current().trim() === "...");
        }

        function isSetting(stream, state) {
            // Return true if the stream is in a settings table and the
            // token is a valid setting
            if (state.isSettingsTable() && state.column === 0) {
                var s = stream.current().trim().toLowerCase();
                if (s.match("^(library|resource|variables|documentation|metadata|" +
                            "suite setup|suite teardown|suite precondition|" +
                            "suite postcondition|force tags|default tags|test setup|" +
                            "test teardown|test precondition|test postcondition|" +
                            "test template|test timeout)$")) {
                    return true;
                }
            }
            return false;
        }

        function isLocalSetting(stream, state) {
            var s = stream.current().trim().toLowerCase();
            if (state.isTestCasesTable()) {
                if (s.match("\\[(documentation|tags|setup|teardown|precondition|postcondition|template|timeout)\\]")) {
                    return true;
                }
            } else if (state.isKeywordsTable()) {
                if (s.match("\\[(documentation|arguments|return|timeout)\\]")) {
                    return true;
                }
            }
            return false;
        }

        function isName(stream, state) {
            // Return true if this is the first column in a test case or keyword table
            if (state.column === 0 && (state.isTestCasesTable() || state.isKeywordsTable())) {
                state.tc_or_kw_name = stream.current();
                return true;
            }
            return false;
        }

        function isSubheading(stream, state) {
            // Return true if a cell begins with two or more colons
            // (eg: ":: Log in") Admittedly, this is a non-standard
            // feature, but it should be pretty harmless (or useful!)
            // for others. My team defines a keyword named ":: {$text}"
            // which we use to organize our code in a long test case
            // or keyword.
            if (stream.match(/^\s*:::? \S.*$/)) {
                return true;
            }
            return false;
        }

        function isComment(stream, state) {
            // Return true if a cell begins with a hash (and optional leading whitesp
            if (stream.match(/^\s*#/)) {
                return true;
            }
            return false;
        }

        return {
            startState: function () {
                return {
                    table_name: null,
                    tc_or_kw_name: null,
                    column: -1,
                    separator: "pipes", // maybe we should get this from preferences?
                    isSettingsTable: function () {return (this.table_name === "settings"); },
                    isVariablesTable: function () {return (this.table_name === "variables"); },
                    isTestCasesTable: function () {return (this.table_name === "test_cases"); },
                    isKeywordsTable: function () {return (this.table_name === "keywords"); },
                    pipeSeparated: function () {return (this.separator == "pipes"); },
                    spaceSeparated: function () {return (this.separator == "spaces"); },
                    tabSeparated: function () {return (this.separator == "tabs"); },
                    setMode: function (new_mode) {
                        // map mode-specific functions to the state object
                        this.separator = new_mode;
                        this.isSeparator = mode[new_mode].isSeparator;
                        this.eatCellContents = mode[new_mode].eatCellContents;
                        this.newline_and_indent = mode[new_mode].newline_and_indent;
                        this.auto_indent = mode[new_mode].auto_indent;
                    }
                };
            },

            token: function (stream, state) {

                if (stream.start === 0 && stream.pos === 0) {
                    state.setMode("spaces");
                }

                // determine separator mode for this line -- pipes or spaces
                if (stream.sol()) {
                    if (stream.peek() === "|") {
                        state.setMode("pipes")
                        state.separator = "pipes";
                        state.column = -1;
                    } else if (stream.peek() === "\t") {
                        state.separator = "tabs";
                        state.column = 0;
                    } else {
                        state.setMode("spaces")
                        state.column = 0;
                        state.separator = "spaces";
                    }
                }

                // comments
                if (isComment(stream, state)) {
                    stream.skipToEnd();
                    return "comment";
                }

                // table headings (eg: *** Test Cases ***)
                if (isHeading(stream, state)) {
                    return "header";
                }

                // subheadings
                // A subheading is a nonstandard thing my team uses. See
                // the definition of isSubheading for more information...
                if (isSubheading(stream, state)) {
                    // It makes sense to use "header" here, but we're already
                    // using "header", and it has behavior assocated with it.
                    //
                    // "def" isn't pendantically correct, but this extension
                    // doesn't use "def" for anything else, so we might as well
                    // use it for this. Pretend "def" means "defines a section"
                    return "def"
                }

                // N.B. Don't ever use "cell-separator" for anything
                // but cell separators. We use this for parsing tokens
                // in other places in the code.
                if (state.isSeparator(stream, state)) {
                    state.column += 1;
                    // this is a custom class (cm-cell-separator)
                    // defined in main.js
                    return "cell-separator";
                }

                var c;
                if ((c = state.eatCellContents(stream, state))) {
                    // a table cell; it may be one of several flavors
                    if (isContinuation(stream, state)) {return "meta"; }
                    if (isLocalSetting(stream, state)) {return "builtin"; }
                    if (isSetting(stream, state))      {return "attribute"; }
                    if (isName(stream, state))         {return "keyword"; }
                }
                return null;
            }
        };

    }

    function get_current_cell_number(cm, pos) {
        // return cell number; cell after the first
        // pipe is zero; if cursor is at the start of
        // the line, return -1

        var i,
            token_center,
            tokens;

        tokens = get_separator_tokens(cm, pos.line);
        if (tokens.length === 0) {
            return 0
        }
        for (i = 0; i < tokens.length; i++) {
            // Tokens can be more than one character wide. We'll
            // compute the center of the token to determine if we're
            // in the cell to the left or right of the separator.
            token_center = (tokens[i].start + tokens[i].end) / 2;
            if (token_center > pos.ch || i === tokens.length - 1) {
                return i - 1;
            }
        }
        return tokens.length - 1;
    }

    function get_current_cell(cm, pos) {
        // return the text of the current cell
        // FIXME: this is terribly ineffecient. both get_cell_contents
        // and get_cell_current_cell_number also call get_cell_ranges. 
        // Is memoization a reasonable solution? 
        var ranges = get_cell_ranges(cm, pos.line);
        var curLine, result;

        if (ranges.length === 0) {
            curLine = cm.getLine(pos.line);
            result = {
                text: curLine,
                start: {line: pos.line, ch: 0},
                end: {line: pos.line, ch: curLine.length}
            }
            return result;
        }

        var cells = get_cell_contents(cm, pos.line);
        var n = get_current_cell_number(cm, pos);

        return {text: cells[n],
                start: ranges[n].start,
                end: ranges[n].end};
    }

    /**
       Special processing for mouse clicks. Specifically, triple-
       and quadruple-clicks. 
     */
    function on_click(cm, event) {
        var pos;
        var selection;
        var cell;

        if (event.detail === 3) {
            pos = cm.getCursor("from");
            // triple-click
            if (select_current_variable(cm, pos)) {
                event.preventDefault();
                return

            } else {
                if (select_current_cell(cm, pos)) {
                    event.preventDefault();
                    return
                }
            }

        } else if (event.detail === 4) {
            // if there is already a selection and the selection
            // matches the variable syntax, we must assume the
            // selection was set by a triple-click. In such a case
            // the quadruple-click should select the whole cell
            // (if it wasn't already selected)
            selection = cm.getSelection()
            pos = cm.getCursor("from");
            if (selection.match(/\$\{.*\}/)) {
                cell = get_current_cell(cm, pos)
                if (cell && cell.text != selection) {
                    if (select_current_cell(cm, pos)) {
                        event.preventDefault();
                        return;
                    }
                }
            }
        }
    }
    
    /**
     * Select the current cell; return true if successful
     */
    function select_current_cell(cm, pos) {
        var cell = get_current_cell(cm, pos);
        if (cell) {
            EditorManager.getCurrentFullEditor()
                .setSelection(cell.start, cell.end);
            return true;
        }
        return false;
    }

    /**
     * if the cursor is inside a variable, select it and
     * return true; otherwise, return false.
     */
    function select_current_variable(cm, pos) {
        var variable = get_current_variable(cm, pos);
        if (variable) {
            EditorManager.getCurrentFullEditor()
                .setSelection(variable.start, variable.end);
            return true;
        }
        return false;
    }
    
    /**
       If the cursor is inside a variable (ie: inbetween ${...}),
       this will return the start and end positions and the text
       betweent those positions.
     */
    function get_current_variable(cm, pos) {
        // if the cursor is inside a variable, return the 
        // starting and ending position.
        var cursor = cm.getSearchCursor("${", pos);
        var match = cursor.findPrevious();
        var start, end, text;
        if (match) {
            // found what looks like the start of a variable; 
            // let's see if we can find the end. 
            start = cursor.from()
            cursor = cm.getSearchCursor("}", start);
            match = cursor.findNext()
            if (match) {
                end = cursor.to()
                if (start.line == pos.line && end.line == pos.line &&
                    start.ch <= pos.ch && end.ch >= pos.ch) {
                    
                    text = cm.getRange(start, end)

                    return {
                        text: text,
                        start: start,
                        end: end
                    }
                }
            }
        }
        return null;
    }

    function on_tab(cm) {
        // maybe-possibly insert a pipe, or move to the next
        // table cell.
        //
        // blank line  : insert '| '
        // '| '        : replace with '| | ' if in a testcase or keyword
        // '| | '      : replace with '| | ... | '
        //
        // if at EOL, and line ends with space-pipe, remove the space-pipe,
        // insert a newline, and match the leading characters of the line

        var pos = cm.getCursor();
        var currentLine = cm.getLine(pos.line);

        // attempt to auto-indent; this will return true if it does
        // something which this block shouldn't mess with.
        var state = cm.getStateAfter(pos.line);
        if (!state.auto_indent(cm, pos)) {
            // if we are at the end of the line and we're not
            // preceeded by a separator AND we're not in a table
            // header, insert a separator. Otherwise, trim the trailing
            // empty cell and move to the next line.
            var token = cm.getTokenAt(pos);
            if (token.type != "header" && token.type != "comment") {
                if (pos.ch == currentLine.length) { // cursor at eol
                    if (currentLine.match(/\.\.\. +\|\s*$/)) {
                        // continuation line
                        state.newline_and_indent(cm, pos);
                        return;

                    } else if (currentLine.match(/ +\|\s*$/)) {
                        // trailing empty cell; remove it and go to
                        // the next line
                        var cursor = cm.getSearchCursor(/(\s+)\|\s*/, pos);
                        var match = cursor.findPrevious();
                        cursor.replace("");
                        state.newline_and_indent(cm, pos);
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
            move_to_next_cell(cm, pos);
        }
    }

    function auto_indent(cm, pos) {
        // attempt to insert an appropriate number of leading
        // pipes or spaces on a line

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

    function get_cell_ranges(cm, line) {
        var separators,
            ranges,
            startToken,
            endToken,
            range;

        ranges = [];
        separators = get_separator_tokens(cm, line);
        for (var i=0; i < separators.length-1; i++) {
            startToken = separators[i];
            endToken = separators[i+1];
            range = {start: {line: line, ch: startToken.end},
                     end:   {line: line, ch: endToken.start}};
            ranges.push(range);
        }

        return ranges;
    }

    // Return a list of the contents of all cells on a line
    function get_cell_contents(cm, line) {
        var ranges = get_cell_ranges(cm, line);
        var text,
            cells;

        cells = [];
        for (var i=0; i < ranges.length; i++) {
            text = cm.getRange(ranges[i].start, ranges[i].end);
            cells.push(text);
        }

        return cells;
    }

    // Return a list of separator tokens. The idea being, we
    // can use this information to move backwards and forwards
    // through the cells on the given line.
    //
    // This will include a null token at the start if the line
    // doesn't start with a separator token, and a null token
    // at the end if the line doesn't end with a separator token
    function get_separator_tokens(cm, line) {
        var currentLine,
            separators,
            token,
            p,
            lastSeparator;

        separators = [];
        currentLine = cm.getLine(line);
        p = {line: line, ch: 0};
        while (p.ch < currentLine.length) {
            token = cm.getTokenAt(p)
            if (token.type == "cell-separator") {
                separators.push(token);
            }
            p.ch = token.end + 1;
        }

        if (separators.length > 0) {
            if (separators[0].start > 0) {
                // first separator is not the first character on a 
                // line. This should probably never happen, but we'll
                // insert a virtual separator at the start.
                token = {start: 0, end: separators[0].start-1, type: null};
                separators.unshift(token);
            }

            lastSeparator = separators[separators.length-1];
            if (lastSeparator.start < currentLine.length) {
                // last separator is not at eol; append a pseudo-separator
                // in the results
                token = {start: currentLine.length, end: currentLine.length, type: null};
                separators.push(token);
            }
        }
        return separators;
    }

    function move_to_next_cell(cm, pos) {
        // move the cursor to the first character in the next cell
        var ranges = get_cell_ranges(cm, pos.line);
        var n = get_current_cell_number(cm, pos);
        if (n < ranges.length - 1) {
            cm.setCursor(ranges[n+1].start)
            return;
        } else {
            cm.setCursor({line: pos.line+1, ch: 0});
            return;
        }                
    }

    function fold_all(cm) {
        var currentLine = null;
        for (var l = cm.firstLine(); l <= cm.lastLine(); ++l) {
            var token = cm.getTokenAt({line:l, ch: 1})
                currentLine = cm.getLine(l);
                cm.foldCode({line: l, ch: 0}, null, "fold");
        }
    }

    function select_current_statement() {
        // Select all of the lines that make up a single statement.
        // It does this by lookup up for the first non-continuation
        // line, and then looking for the next non-continuation line.
        var editor = EditorManager.getCurrentFullEditor()
        var pos = editor.getCursorPos()
        var start = _find_statement_start(editor, pos);
        var end = _find_statement_end(editor, pos);
        editor.setCursorPos(start);
        editor.setSelection(start, {line: end.line+1, ch: 0});
    }

    function _find_statement_end(editor, pos) {
        var nextline = editor.document.getLine(pos.line+1);
        while (nextline && nextline.match(/^\|\s+\|\s+\.\.\.\s+\|($|\s+)/)) {
            pos.line += 1;
            nextline = editor.document.getLine(pos.line+1);
        }
        return {line: pos.line, ch: pos.ch};
    }

    function _find_statement_start(editor, pos) {
        var line = editor.document.getLine(pos.line);
        // find start of statement
        while (pos.line > 0 && line.match(/^\|\s+\|\s+\.\.\.\s+\|($|\s+)/)) {
            pos.line -= 1;
            line = editor.document.getLine(pos.line);
        }
        return {line: pos.line, ch: 0};
    }

    exports.select_current_statement = select_current_statement;
    exports.overlay_mode = overlay_mode;
    exports.base_mode = base_mode;
    exports.on_tab = on_tab;
    exports.on_click = on_click;
    exports.get_current_cell = get_current_cell;
    exports.get_current_cell_number = get_current_cell_number;
    exports.get_cell_contents = get_cell_contents;
})
