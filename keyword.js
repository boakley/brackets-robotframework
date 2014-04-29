// Define classes for managing keyword documentation
//
// KeywordLibrary - a class which stores the documentation for 
//                  the keywords in a robot library
// Keyword        - a class which stores the documentation for
//                  one particular keyword

define(function(require, exports, module) {
    'use strict';

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

    KeywordLibrary.prototype.keywords = function(pattern /* optional */) {
	var result = [];
	for (var i = 0; i < this._keywords.length; i++) {
            var name = this._keywords[i].name
            if (pattern && (! name.match(pattern))) {
                continue
            }
            result.push(name);
	}
	return result;
    };

    KeywordLibrary.prototype.add_keyword = function(name, args, doc) {
	this._keywords.push(new Keyword(name, args, doc));
    };

    function Keyword(name, args, doc) {
	this.name = name.trim();
	this.args = args;
	this.doc = doc;
    };

    exports.KeywordLibrary = KeywordLibrary;
    exports.Keyword = Keyword;
});
