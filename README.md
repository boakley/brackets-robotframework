brackets-robotframework
=======================

This brackets extension provides syntax highlighting for robotframework test cases
and resource files that use the pipe-delimited plain-text format.

This is a very early version of the plugin, with very few features. At present, the
primary features are:

- Syntax highlighting
- Code folding 
- Special handling of the <tab> key

Usage:

In addition to syntax highllighting, this extension currently overrides the default
behavior of the Tab key. Instead of indenting a line of code, it will attempt to insert
an appropriate number of spaces and pipes. 

For example, if the cursor is at the beginning of a blank line, pressing tab will insert
a single pipe and space. If you press tag again, you will get a second pipe and space. If you 
press Tab again, you will end up with "| | ... | ". 

If you are at the end of a line, you can press tab to insert a pipe-space-pipe, making
it easier to extend the current row. If you are at the end of a line that already has
a space-pipe-space, pressing tab will remove this trailing pipe and move the cursor to the 
start of the next cell. 





