import simplejson
import copy
import yaml


def BoolIsTrueish(val):
    if type(val) is bool:
        return val
    if type(val) is str:
        return (val.lower() == 'yes') or (val.lower() == 'y') or (val.lower() == 'true') or (val.lower() == '1')
    if type(val) is int:
        return val > 0
    raise Exception('Invalid boolean conversion')


class SettingsLoader:
    def __init__(self, fileName = None):
        if fileName is not None:
            self.fileName = fileName
            with open(self.fileName, 'r') as configfile:
                self.settings = yaml.load(configfile.read())
        else:
            self.fileName = ''

    def RequireTokens(self, tokensList):
        self._CheckLoaded()
        self.DefineKnownTokens(tokensList)
        for token in tokensList:
            if token not in self.settings:
                raise Exception('Missing token "{0}" in file "{1}"'.format(token, self.fileName))

    def DefineKnownTokens(self, tokensList):
        self._CheckLoaded()
        for token in tokensList:
            if token not in self.settings:
                for token2 in self.settings:
                    if token2.lower() == token.lower():
                        self.settings[token] = self.settings.pop(token2)

    def ConvertToken_Boolean(self, token):
        self._CheckLoaded()
        if token in self.settings:
            if BoolIsTrueish(self.settings[token]):
                self.settings[token] = True
            else:
                self.settings[token] = False

    def AddTokenIfMissing(self, token, value):
        self._CheckLoaded()
        if token not in self.settings:
            self.settings[token] = value

    def DropTokens(self, tokensList):
        self._CheckLoaded()
        for token in tokensList:
            if token in self.settings:
                del self.settings[token]


    def Clone(self):
        self._CheckLoaded()
        cpy = SettingsLoader()
        cpy.settings = copy.deepcopy(self.settings)
        return cpy


    def _CheckLoaded(self):
        if self.settings is None:
            raise Exception('Settings not loaded')

    def __getitem__(self, item):
        self._CheckLoaded()
        return self.settings[item]

    def Get(self):
        self._CheckLoaded()
        return self.settings

    def GetTokenList(self):
        return [token for token in self.settings]

    def ToJSON(self):
        self._CheckLoaded()
        return simplejson.dumps(self.settings)
