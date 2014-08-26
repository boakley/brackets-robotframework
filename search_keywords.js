/*
 * search_keywords.js - implement a panel for searching for keywords
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, CodeMirror, _showKeywords */

define(function (require, exports, module) {
    "use strict";
    
    var CommandManager      = brackets.getModule("command/CommandManager"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Menus               = brackets.getModule("command/Menus"),
        PanelManager        = brackets.getModule("view/PanelManager");

    var prefs = PreferencesManager.getExtensionPrefs("robotframework");

    var panelHtml           = require("text!templates/bottom-panel.html"),
        keywordsHtml        = require("text!templates/keywords-table.html"),
        keyList = [],
        panel,
        keymap = [{
            // What's the right key here? For now I'm picking backslash
            // simply because it's an unshifted pipe, because pipes. 
            key: "Ctrl-Alt-\\"
        }, {
            key: "Ctrl-Alt-\\",
            platform: "mac"
        }],
        $filterField,
        currentFilter;

    var TOGGLE_KEYWORDS_ID  = "bryanoakley.show-robot-keywords";

    var sortByName = 1,
        sortBySource = 2,
        sortByDocumentation = 3,
        sortColumn = sortByName,
        sortAscending = true;

    // This performs a synchronous call to get the keyword data. 
    // Maybe this should be async?
    function getKeywordList() {
        var hub_url = prefs.get("hub-url"),
            keyword_url = hub_url + "/api/keywords?pattern=*&fields=library,name,synopsis,doc_keyword_url",
            doc_url,
            i;

        $.ajaxSetup({ "async": false});
        var keywords = [];

        var response = $.ajax({
            url: keyword_url,
            dataType: 'json',
            async: false,
            success: function (data) {
                for (i = 0; i < data.keywords.length; i++) {
                    doc_url = hub_url + data.keywords[i].doc_keyword_url;
                    keywords.push({keywordSource: data.keywords[i].library,
                                   keywordName: data.keywords[i].name,
                                   keywordDocumentation: data.keywords[i].synopsis,
                                   keywordURL: doc_url,
                                   filter: data.keywords[i].name.toLowerCase()
                                  });
                }
            }
        });

        return keywords;
    }

    function _strcmp(a, b) {
        if (a < b) {
            return (sortAscending ? -1 : 1);
        } else if (a > b) {
            return (sortAscending ? 1 : -1);
        }
        return 0;
    }

    function _keywordNameSort(a, b) {
        return _strcmp(a.keywordName, b.keywordName);
    }

    function _keywordSourceSort(a, b) {
        return _strcmp(a.keywordSource, b.keywordSource);
    }

    function _keywordDocumentationSort(a, b) {
        return _strcmp(a.keywordDocumentation, b.keywordDocumentation);
    }

    function _getSortFunc() {
        if (sortColumn === sortBySource) {
            return _keywordSourceSort;
        } else if (sortColumn === sortByDocumentation) {
            return _keywordDocumentationSort;
        }
        return _keywordNameSort;
    }

    function _getKeywordsHtml() {
        var msData = {};
        msData.keyList = keyList.sort(_getSortFunc());
        return Mustache.render(keywordsHtml, msData);
    }

    function _changeSorting(newSortColumn) {
        if (newSortColumn === sortColumn) {
            // toggle sort of current colum
            sortAscending = !sortAscending;
        } else {
            // sort on new column
            sortColumn = newSortColumn;
        }
        
        _showKeywords();
    }

    function _filterKeywords(forceFiltering) {
        var terms = $filterField.val().trim().toLocaleLowerCase();
        if (forceFiltering || terms !== currentFilter) {
            currentFilter = terms;
            terms = terms.split(/\s+?/);
            $.each(keyList, function (i, key) {
                var match;
                if (terms === "") {
                    match = true;
                } else {
                    $.each(terms, function (i, term) {
                        if (match !== false) {
                            match = key.filter.indexOf(term) > -1;
                        }
                    });
                }
                key.filterMatch = match;
            });
        }
    }

    function _showKeywords() {
        var $keywords = $("#keywords");
        
        // Apply any active filter
        _filterKeywords(true);

        // Add new markup
        $keywords.find(".resizable-content").html(_getKeywordsHtml());
        $keywords.find("thead th").eq(sortColumn - 1).addClass('sort-' + (sortAscending ? 'ascending' : 'descending'));

        // Setup header sort buttons
        $("thead .keyword-name a", $keywords).on("click", function () {
            _changeSorting(sortByName);
        });
        $("thead .keyword-source a", $keywords).on("click", function () {
            _changeSorting(sortBySource);
        });
        $("thead .keyword-synopsis a", $keywords).on("click", function () {
            _changeSorting(sortByDocumentation);
        });
    }

    function _handleShowHideKeywords() {
        if (panel.isVisible()) {
            // free up some memory when we hide the panel
            panel.hide();
            keyList = [];
            CommandManager.get(TOGGLE_KEYWORDS_ID).setChecked(false);
            EditorManager.focusEditor();

        } else {
            panel.show();
            CommandManager.get(TOGGLE_KEYWORDS_ID).setChecked(true);
            $filterField.val("").focus();

            if (keyList.length === 0) { keyList = getKeywordList(); }
            _showKeywords();
        }
        EditorManager.resizeEditor();
    }

    function init(robotMenu) {
        var $keywordsPanel,
            $keywordsContent;

        ExtensionUtils.loadStyleSheet(module, "keywords.css");

        CommandManager.register("Search for keywords", TOGGLE_KEYWORDS_ID, _handleShowHideKeywords);
        if (robotMenu) {
            robotMenu.addMenuItem(TOGGLE_KEYWORDS_ID, keymap);
        }

        panel = PanelManager.createBottomPanel(TOGGLE_KEYWORDS_ID,
                                               $(Mustache.render(panelHtml, null)),
                                               100);
        panel.hide();

        $keywordsPanel = $("#keywords");
        $keywordsContent = $keywordsPanel.find(".resizable-content");

        $keywordsPanel.find(".close").click(function () {
            CommandManager.execute(TOGGLE_KEYWORDS_ID);
        });

        $filterField = $keywordsPanel.find(".toolbar .filter");
        $filterField.on("keyup", _showKeywords);
    }

    exports.init = init;
});
