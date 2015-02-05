brackets-robotframework
=======================

This brackets extension provides syntax highlighting for robotframework test cases
and resource files that use the pipe-delimited plain-text format.

This extension includes the following features:

- Syntax highlighting
- Code folding 
- Special handling of the \<tab\> key
- Code completion (if robotframework-hub is running)
- Quickdocs for keywords (if robotframework-hub is running)
- Integration with robotframework-lint
- Run tests from within the editor

For code completion and quickdocs you need to install and run 
the robotframework hub. See https://github.com/boakley/robotframework-hub

For robotframework-lint support you must install robotframework-lint.
See https://github.com/boakley/robotframework-lint

Usage
-----

In addition to syntax highllighting, this extension currently overrides the default
behavior of the Tab key. Instead of indenting a line of code, it will attempt to insert
an appropriate number of spaces and pipes. 

For example, if the cursor is at the beginning of a blank line, pressing tab will insert
a single pipe and space. If you press tag again, you will get a second pipe and space. If you 
press Tab again, you will end up with "| | ... | ". 

If you are at the end of a line, you can press tab to insert a pipe-space-pipe, making
it easier to extend the current row. If you are at the end of a line that already has
a space-pipe-space, pressing tab will remove this trailing pipe, then insert a newline
and enough pipes and spaces and continuation characters to match the line you were
just on. 

This is an experimental feature. The goal is to be able to make editing more effecient,
by letting you press tab rather than space-pipe-space, and to intelligently insert the
appropriate number of pipes and spaces based on context.

Screenshot
==========
![screenshot](https://raw.githubusercontent.com/boakley/brackets-robotframework/master/images/robot-mode.png)
