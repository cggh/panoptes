# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import simplejson
import copy
import yaml
import ImportError


def BoolIsTrueish(val):
    if type(val) is bool:
        return val
    if type(val) is str:
        return (val.lower() == 'yes') or (val.lower() == 'y') or (val.lower() == 'true') or (val.lower() == '1')
    if type(val) is int:
        return val > 0
    raise Exception('Invalid boolean conversion')


class SettingsLoader:
    def __init__(self, fileName = None, log = True):
        if fileName is not None:
            self.fileName = fileName
            with open(self.fileName, 'r') as configfile:
                if log:
                    print('Loading settings from: '+fileName)
                try:
                    self.settings = yaml.load(configfile.read())
                except Exception as e:
                    print('ERROR: yaml parsing error: ' + str(e))
                    raise ImportError.ImportException('Error while parsing yaml file {0}'.format(fileName))
                if log:
                    print('Settings: '+str(self.settings))
        else:
            self.fileName = ''

    def __str__(self):
        return str(self.settings)
    
    def LoadDict(self, st):
        self.settings = copy.deepcopy(st)

    def AddDict(self, st):
        self._CheckLoaded()
        self.settings.update(copy.deepcopy(st))

    def RequireTokens(self, tokensList):
        self._CheckLoaded()
        self.DefineKnownTokens(tokensList)
        for token in tokensList:
            if token not in self.settings:
                errorstr = 'Missing token "{0}"'.format(token)
                if (self.fileName is not None) and (len(self.fileName) > 0):
                    errorstr += 'in file "{0}"'.format(self.fileName)
                raise Exception(errorstr)

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

    def SetToken(self, token, value):
        if not(self.HasToken(token)):
            self.AddTokenIfMissing(token, value)
        else:
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

    def ConvertStringsToSafeSQL(self):
        self._CheckLoaded()
        for key in self.settings:
            val = self.settings[key]
            if type(val) is str:
                self.settings[key] = val.replace('"', '`').replace("'", '`')

    def HasToken(self, token):
        self._CheckLoaded()
        return token in self.settings

    def GetTokenList(self):
        return [token for token in self.settings]

    def ToJSON(self):
        self._CheckLoaded()
        return simplejson.dumps(self.settings)
