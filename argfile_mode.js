// A quick hack to support argument files. Not complete,
// but it's better'n nuthin'

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";

    function argfileMode(config, parserConfig) {
        // This defines a simple mode for robotframework
        // argument files

        var mode = {
            startState: function () {
                return {
                    is_namevalue: false
                };
            },
            token: function (stream, state) {
                if (stream.match(/^#.*$/)) {
                    state.is_namevalue = false;
                    return "comment";
                }
                if (stream.match(/^-v|M|--variable|--metadata(?==|\s+)/)) {
                    state.is_namevalue = true;
                    stream.eatSpace();
                    return "meta";
                }
                if (stream.match(/^-[a-zA-Z]|--\w+/)) {
                    state.is_namevalue = false;
                    stream.eatSpace();
                    return "meta";
                }
                if (state.is_namevalue && stream.match(/\w+(?=:)/)) {
                    return "variable";
                }
                if (state.is_namevalue && stream.match(/[:=]/)) {
                    return "operator";
                }
                if (state.is_namevalue) {
                    stream.skipToEnd();
                    state.is_namevalue = false;
                    return "string";
                }
                stream.skipToEnd();
                return null;
            }
        };
        return mode;
    }
    
    exports.argfileMode = argfileMode;

});
