// Define classes for managing keyword documentation
//
// KeywordLibrary - a class which stores the documentation for 
//                  the keywords in a robot library
// Keyword        - a class which stores the documentation for
//                  one particular keyword

define(function(require, exports, module) {
    function KeywordLibrary(name, path) {
	this.name = name;
	this.path = path;
	this._keywords = []
    };

    KeywordLibrary.prototype.contains = function(keyword) {
	keyword = keyword.trim().toLowerCase();
	for (var i = 0; i < this._keywords.length; i++) {
	    if (this._keywords[i].name.toLowerCase() === keyword) {
		return true;
	    }
	}
	return false;
    };

    KeywordLibrary.prototype.keywords = function() {
	var result = [];
	for (var i = 0; i < self._keywords.length; i++) {
	    result.push(self._keywords[i].name);
	}
	return result;
    };

    KeywordLibrary.prototype.add_keyword = function(name, arguments, doc) {
	this._keywords.push(new Keyword(name, arguments, doc));
    };

    function Keyword(name, arguments, doc) {
	this.name = name.trim();
	this.arguments = arguments;
	this.doc = doc;
    };

    exports.KeywordLibrary = KeywordLibrary;
    exports.Keyword = Keyword;
});
