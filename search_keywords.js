/*
 * search_keywords.js - implement a panel for searching for keywords
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, brackets, $, Mustache, CodeMirror, _showKeywords, _showHubNotice */

define(function (require, exports, module) {
    "use strict";
    
    var CommandManager      = brackets.getModule("command/CommandManager"),
        PreferencesManager  = brackets.getModule("preferences/PreferencesManager"),
        EditorManager       = brackets.getModule("editor/EditorManager"),
        ExtensionUtils      = brackets.getModule("utils/ExtensionUtils"),
        Menus               = brackets.getModule("command/Menus"),
        WorkspaceManager    = brackets.getModule('view/WorkspaceManager'),
        MainViewManager     = brackets.getModule('view/MainViewManager');

    var prefs = PreferencesManager.getExtensionPrefs("robotframework");

    var panelHtml           = require("text!templates/keyword-search-panel.html"),
        keywordsHtml        = require("text!templates/keywords-table.html"),
        keyList = [],
        panel,
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

    function _showHubNotice() {
        var noticeHtml = require("text!templates/rfhub-notice.html");
        $("#keywords .resizable-content").html(noticeHtml);
        $("#keywords .toolbar .filter").hide();
    }

    function _showKeywords() {
        var $keywords = $("#keywords");
        
        if (keyList.length === 0) {
            return
        }

        $("#keywords .toolbar .filter").show();

        // Apply any active filter
        _filterKeywords(true);

        // Add new markup
        $keywords.find(".resizable-content").html(_getKeywordsHtml());
        $keywords.find("thead th").eq(sortColumn).addClass('sort-' + (sortAscending ? 'ascending' : 'descending'));

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

        // set up the paste buttons
        $keywords.find(".keyword-paste").on("click", function() {
            var kwname = $(this).parent().find(".keyword-name a").text();
            _pasteSelectedKeyword(kwname);
        })
    }

    function _pasteSelectedKeyword(kwname) {
        var editor = EditorManager.getCurrentFullEditor();
        if (!editor) {return; }

        var cm = editor._codeMirror;
        if (!cm) { return; }
        
        cm.replaceSelection(kwname);
    }

    function toggleKeywordSearch() {
        _handleShowHideKeywords();
    }

    function _handleShowHideKeywords() {
        if (panel.isVisible()) {
            // free up some memory when we hide the panel
            panel.hide();
            keyList = [];
            CommandManager.get(TOGGLE_KEYWORDS_ID).setChecked(false);
            MainViewManager.focusActivePane();

        } else {
            panel.show();
            CommandManager.get(TOGGLE_KEYWORDS_ID).setChecked(true);
            $filterField.val("").focus();

            initializeKeywordList();
        }
        WorkspaceManager.recomputeLayout();
    }

    function initializeKeywordList() {
        var hub_url = prefs.get("hub-url"),
            keyword_url = hub_url + "/api/keywords?pattern=*&fields=library,name,synopsis,doc_keyword_url",
            doc_url,
            i;

        var keywords = [];

        $("#keywords .toolbar #title").text("Retrieving keyword data...");
        $("#keywords .toolbar #spinner").attr("class", "spinner spin");

        var response = $.ajax({
            url: keyword_url,
            dataType: 'json',
            async: true,
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

                keyList = keywords;
                _showKeywords();
            },
            error: function (data, status, error) {
                keyList = null;
                _showHubNotice();
            },
            complete: function (data, status) {
                $("#keywords .toolbar #title").text("Robot Framework Keywords");
                $("#keywords .toolbar #spinner").attr("class", "");
            }
        });

    }

    function init() {
        var $keywordsPanel,
            $keywordsContent;

        ExtensionUtils.loadStyleSheet(module, "keywords.css");

        panel = WorkspaceManager.createBottomPanel(TOGGLE_KEYWORDS_ID,
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
    exports.toggleKeywordSearch = toggleKeywordSearch;
});
