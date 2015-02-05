'''zipper.py - create the extension .zip file

This creates a zip file suitable for uploading to the extension registry.
'''

'''
given a string like "foo/bar/baz", I need to "mkdir" foo/bar"
'''


from zipfile import ZipFile, ZIP_STORED
import os
import json
from pprint import pprint
import glob
import shutil

class Zipper(object):
    def __init__(self):
        with open("package.json", "r") as f:
            self.package = json.load(f)
        self.root = "brackets-robotframework"
        here = os.path.dirname(__file__)
        zipname = "%s-%s.zip" % (self.root, self.package["version"])
        self.filename = os.path.join(here, "build", zipname)
        self._dirs = []

    def _add(self, zf, path):
        print "+",path
        if os.path.isdir(path):
            for filename in glob.glob(path + "/*"):
                self._add(zf, filename)
        else:
            dirname = os.path.dirname(path)
            self._mkZipDir(zf, dirname)
            zf.write(path, os.path.join(self.root,path))

    def _mkZipDir(self, zf, path):
        if os.path.isdir(path) and path not in self._dirs:
            zf.write(path, os.path.join(self.root, path), compress_type = ZIP_STORED)
            self._dirs.append(path)

    def zip(self):
        with ZipFile(self.filename, "w") as zf:
            self._mkZipDir(zf, ".")
            self._mkZipDir(zf, "node")
            self._mkZipDir(zf, "node/node_modules")
            self._mkZipDir(zf, "templates")
#            zf.write(".", self.root, compress_type = ZIP_STORED)
            for pattern in self.package["files"]:
                for filename in glob.glob(pattern):
                    self._add(zf, filename)
        print "created", self.filename

if __name__ == "__main__":
    zipper = Zipper()
    zipper.zip()
