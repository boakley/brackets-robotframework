define(["robot"], function (require, exports, module) {
    'use strict';
  
    var LanguageManager = brackets.getModule("language/LanguageManager");
    var AppInit         = brackets.getModule("utils/AppInit");

    function initializeUI() {
        // do some mode-specific initialization that can only be done after 
        // an editor has been instantiated.
        var EditorManager   = brackets.getModule("editor/EditorManager");
        var DocumentManager = brackets.getModule("document/DocumentManager");
	var editor = EditorManager.getCurrentFullEditor()
        if (editor.getModeForDocument() === "robot") {
	    var cm = editor ? editor._codeMirror : null;
            if (cm && (typeof editor.initialized === 'undefined' || !editor.initialized)) {
		var extraKeys = cm.getOption('extraKeys');
                extraKeys.Tab = robot.on_tab;
                cm.addOverlay(robot.overlay_mode());
                editor.initialized = true;
            }
        }
    }


    AppInit.appReady(function () {
        var DocumentManager = brackets.getModule("document/DocumentManager");
        
        // the event is *not* fired for the initial document, so 
        // we have to call it directly at startup.
	$(DocumentManager).on("currentDocumentChange", initializeUI);
        initializeUI();
        
    });

    LanguageManager.defineLanguage("robot", {
      name: "robot",
      mode: "robot",
      fileExtensions: ["robot"],
      lineComment: ["#"]
  });
});

