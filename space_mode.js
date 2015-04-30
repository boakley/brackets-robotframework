/*
 * space_mode.js - function implementations unique to space-separated files
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, CodeMirror, _showKeywords, _showHubNotice */

define(function (require, exports, module) {
    "use strict";

    function isSeparator(stream) {
        // Return true if the stream is currently in a separator
        // (read: tab, or two or more whitespace characters
        var match = stream.match(/(\t|\s{2,})/);
        return match;
    }

    function eatCellContents(stream, state) {
        // gobble up characters until the end of the line or we find a separator

        var ch;

        while ((ch = stream.next()) != null) {
            if (ch === "\\") {
                // escaped character; gobble up the following character
                stream.next();

            } else if (ch === "\t") {
                stream.backUp(1);
                break;

            } else if (ch === " ") {
                if (stream.match(/\s/, false)) {
                    stream.backUp(1);
                    break;
                }
            }
        }
        return (stream.current().length > 0);
    }

    exports.isSeparator = isSeparator;
    exports.eatCellContents = eatCellContents;
})
