## 1.1.4 - 2015-03-03
minor bug fix 

### Fixed
* fixed deprecation warnings in brackets 1.2:
  "Deprecated: Do not use $().on/off() on Brackets modules and model"

## 1.1.3 - 2015-02-05

### Added

* dialog for setting preferences
* integration with robotframework-lint
* triple-click select everything in a cell, or an entire variable
* added experimental "Find Definition" command for finding where a
  keyword is defined
	
### Fixed
* removed use of deprecated brackets API functions
* #9 - Add support for "Find Definition"

## 1.0.0 - 2014-09-09

Version 1.0.0 brings some major new functionality: search keywords
from within the editor, and run tests from within the editor.

### Added

* Robot menu in the menubar
* Ability to search keywords within the editor [1]
* Ability to run test cases from within the editor

1: Requires that you are running [robot framework hub]
   (https://github.com/boakley/robotframework-hub/wiki)

### Fixed
* console log messages when trying to find the last
  collapsible region on a page
* #22: quickdocs hard to read in some dark themes
* #21: code hints shouldn't append pipe if hinting in middle of a line
* #20: quickdocs should work when in cell after keyword
* #17: quickdocs needs to "unlist" arguments
* #14: code folding broken for test cases that don't begin with a-z

## 0.9.5 - 2014-08-18
* improved code hints
* Added 'vv' as a shortcut for inserting ${}
* Keyword hints for local keywords

## 0.9.4 - 2014-08-03
* Syntax highlighting for argument files (.args extension)
* improved code hints

### Added


