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
                print('Loaded settings from: '+fileName+'\n'+str(self.settings))
        else:
            self.fileName = ''

    def LoadDict(self, st):
        self.settings = copy.deepcopy(st)



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
        self.DefineKnownTokens([token])
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

    def GetSubSettings(self, token):
        self._CheckLoaded()
        if not self.HasToken(token):
            raise Exception('Missing settings token '+token)
        if type(self.settings[token]) is not dict:
            raise Exception('Not a subtoken: '+token)
        st = SettingsLoader()
        st.LoadDict(self.settings[token])
        return st

    def HasToken(self, token):
        self._CheckLoaded()
        return token in self.settings

    def GetTokenList(self):
        return [token for token in self.settings]

    def ToJSON(self):
        self._CheckLoaded()
        return simplejson.dumps(self.settings)
