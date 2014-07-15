define(function(require, exports, module) {
    'use strict';

    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    var StatusBar = brackets.getModule("widgets/StatusBar");
    var DocumentManager = brackets.getModule("document/DocumentManager");
    var prefs = PreferencesManager.getExtensionPrefs("robotframework");
    var robot = require("./robot");
    var InlineDocsViewer = require("InlineDocsViewer");

    function callRFHub(url, result) {
	$.ajaxSetup({ "async": false});
        var result = null;
        var response = $.getJSON(url, function(data) {
	    StatusBar.updateIndicator("rfhub-error", false)
            result = data;

        }).fail(function(jqxhr, textStatus, error) {
	    StatusBar.updateIndicator("rfhub-error", true)
        })
	$.ajaxSetup({ "async": true});
        return result
    }
    
    function getKeywordDocs(editor, pos) {
        var keyword = getKeyword(editor, pos);
        var prefs = PreferencesManager.getExtensionPrefs("robotframework");
        var hub_url = prefs.get("hub-url");
        var url = hub_url + "/api/keywords?pattern=^" + keyword + "";

        var result = null;
        var data = callRFHub(url);
        if (data.keywords.length > 0) {
            result = {
                args:        data.keywords[0].args,
                doc:         data.keywords[0].doc,
                htmldoc:     data.keywords[0].htmldoc,
                library:     data.keywords[0].library,
                library_url: data.keywords[0].library_url,
                name:        data.keywords[0].name
            }
            return result;
        }
        return null;
    }
    
    function getKeyword(editor, pos) {
        var cm = editor._codeMirror;
        var cell = robot.get_current_cell(cm, pos);
        if (cell.text.trim().substring(0,1) === "#") {
            // this is a comment, so ignore it
            return null;
        }
        return cell.text;
    }

    function inlineDocsProvider(editor, pos) {
        
        // Only provide docs when cursor is in php ("clike") content
        var langId = editor.getLanguageForSelection().getId();
        if (langId !== "robot") {
            return null;
        }
        
        // Only provide docs if there is no multiline selection
        var sel = editor.getSelection();
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
	// Get the keyword near the cursor
        var kw = getKeyword(editor, pos)

        var docs = getKeywordDocs(editor, pos);
        if (docs === null) {
            return false;
        }

        var inlineWidget = new InlineDocsViewer(docs.name, {
            keyword_name: docs.name,
            keyword_doc: docs.htmldoc,
            keyword_args: docs.args,
            keyword_library: docs.library,
            rfhub_url: "http://localhost:7070/doc/keywords/BuiltIn/Repeat%20Keyword"
        });

	var result = new $.Deferred();
	inlineWidget.load(editor);
	result.resolve(inlineWidget);
	return result.promise();				
    }

    exports.inlineDocsProvider = inlineDocsProvider;

});
