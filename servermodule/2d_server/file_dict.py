from os.path import exists, join
from os import listdir, remove, makedirs
from stuf.base import backport
quote_plus = backport('urllib.quote_plus', 'urllib.parse.quote_plus')
unquote_plus = backport('urllib.unquote_plus', 'urllib.parse.unquote_plus')

class FileDict():

    '''Base for file based storage.'''

    def __init__(self, dir, **kw):
        self._dir = dir
        # Create directory
        if not exists(self._dir):
            self._createdir()

    def __getitem__(self, key):
        # (per Larry Meyn)
        try:
            with open(self._key_to_file(key), 'rb') as item:
                return item.read()
        except (IOError, OSError):
            raise KeyError(key)

    def __setitem__(self, key, value):
        # (per Larry Meyn)
        # try:
            with open(self._key_to_file(key), 'wb') as item:
                item.write(value)
        # except (IOError, OSError):
        #     raise KeyError(key)

    def __delitem__(self, key):
        try:
            remove(self._key_to_file(key))
        except (IOError, OSError):
            raise KeyError(key)

    def __iter__(self, unquote_plus=unquote_plus):
        for name in listdir(self._dir):
            if not name.startswith('.'):
                yield unquote_plus(name)

    def __contains__(self, key):
        return exists(self._key_to_file(key))

    def __len__(self):
        return len([i for i in listdir(self._dir) if not i.startswith('.')])

    def _createdir(self):
        # creates the store directory
        try:
            makedirs(self._dir)
        except OSError:
            raise EnvironmentError(
                'cache directory "{0}" does not exist and could not be '
                'created'.format(self._dir)
            )

    def _key_to_file(self, key):
        # gives the filesystem path for a key
        return join(self._dir, quote_plus(key))
