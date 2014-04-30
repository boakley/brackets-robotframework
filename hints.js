// This defines a hintProvider for robotframework files
//

define(function(require, exports, module) {
    'use strict';

    var robot = require("./robot");

    // 'libraries' should be a list of KeywordLibrary objects
    function HintProvider(libraries) {
        this.libraries = libraries;

        // these will be set in hasHints, and used in 
        // getHints and insertHint:
        this.hints = []; 
        this.match = "";
        this.cell = null; 
    }

    HintProvider.prototype.hasHints = function(editor, implicitChar) {
        this.editor = editor;
        if (implicitChar === null) {
            var cm = editor._codeMirror;
            var pos = this.editor.getCursorPos();
            var cell = robot.get_current_cell(cm, pos);
            this.cell = cell; 
            this.match = cell.text;
            this.hints = this._get_hints(cell.text);
            return (this.hints.length > 0);
        } // FIXME: add special mode for an implicit char of "["
        return false;
    };

    HintProvider.prototype.getHints = function(implicitChar) {
        return {hints: this.hints, match: this.match, selectInitial: true};
    };

    HintProvider.prototype.insertHint = function(hint) {
        this.editor.document.replaceRange(hint, this.cell.start, this.cell.end);
        return false;
    };

    HintProvider.prototype._get_hints = function(prefix) {

        // get a list of hints
        var pattern = new RegExp("^" + prefix + ".*", "i");
        var hints = []
        // FIXME: I need a "get_local_keywords" method in the
        // robot mode, so I can get local keywords in addition
        // to library keywords...
        for (var i=0; i < this.libraries.length; i++) {
            var lib = this.libraries[i];
            var tmp = lib.keywords(pattern);
            this.libraries[i].keywords(pattern).map(function(item) {
                if (hints.indexOf(item) == -1) {
                    hints.push(item);
                }
            })
        }
        return hints;
    }

    exports.HintProvider = HintProvider;
});
