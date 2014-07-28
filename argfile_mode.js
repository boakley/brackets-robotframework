// A quick hack to support argument files. Not complete,
// but it's better'n nuthin'
define(function(require, exports, module) {
    "use strict"; 

    function argfile_mode(config, parserConfig) {
        // This defines a simple mode for robotframework
        // argument files

        var mode = {
            startState: function() {
                return {
                    is_namevalue: false,
                }; 
            },
            token: function(stream, state) {
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
                };
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
    };
    
    exports.argfile_mode = argfile_mode;

});
