# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
from builtins import object
import DQXDbTools
import config
#As the db is local to panoptes set this here:
config.DB = "datasets"
import re
import os

try:
    # Try to get authorisation file from config.py
    authFileName = config.AUTHORISATIONFILE
except:
    # Use default location
    authFileName = os.path.join(os.path.dirname(__file__), 'PanoptesAuthDb')

# Authorization managed by Panoptes
# Takes a DQXDbTools.CredentialInformation and DQXDbTools.DbOperation instance
# Returns a DQXDbTools.DbAuthorization instance
def CanDo(credInfo, operation):

    #print('CHECKING AUTH on '+credInfo.clientaddress)

    # Check for Panoptes-specific utility stuff

    # We can read everything from the index database
    if not(operation.IsModify()) and operation.OnDatabase(config.DB):
        return DQXDbTools.DbAuthorization(True)
    # We can do all actions on index database, table 'datasetindex'
    if operation.OnDatabase(config.DB) and operation.OnTable('datasetindex'):
        return DQXDbTools.DbAuthorization(True)

    if operation.OnDatabase(config.DB):
        if operation.OnTable('storedviews'):
            return DQXDbTools.DbAuthorization(True)
    if operation.OnTable('storedqueries'):
        return DQXDbTools.DbAuthorization(True)
    if operation.OnTable('storedsubsets'):
        return DQXDbTools.DbAuthorization(True)

    authRules = PnAuthRuleSet()

    if authRules.Match(credInfo, operation.databaseName, PnAuthRule.edit):
        if operation.OnTable('notes'):
            return DQXDbTools.DbAuthorization(True)
        if operation.OnColumn('StoredSelection'):
            return DQXDbTools.DbAuthorization(True)

    if not(operation.IsModify()):
        # Check if any of the rules allows reading
        if authRules.Match(credInfo, operation.databaseName, PnAuthRule.read):
            return DQXDbTools.DbAuthorization(True)
        return DQXDbTools.DbAuthorization(False, 'The login used does not allow you to view these data.')

    if authRules.Match(credInfo, operation.databaseName, PnAuthRule.manage):
        return DQXDbTools.DbAuthorization(True)

    return DQXDbTools.DbAuthorization(False, 'The login used does not allow you to perform this change.')


def IsDataSetManager(credInfo, databaseName):
    authRules = PnAuthRuleSet()
    return authRules.Match(credInfo, databaseName, PnAuthRule.manage)


def VerifyIsDataSetManager(credInfo, databaseName):
    authRules = PnAuthRuleSet()
    if authRules.Match(credInfo, databaseName, PnAuthRule.manage):
        return
    raise DQXDbTools.CredentialException('No managament privileges for database ' + databaseName)


class PnAuthRule(object):
    read = 1
    edit = 2
    manage = 3

    def __init__(self, userPattern, dataSetPattern, privToken):
        self.userPattern = userPattern
        self.dataSetPattern = dataSetPattern
        self.privLevel = 0
        if privToken == 'read':
            self.privLevel = PnAuthRule.read
        if privToken == 'edit':
            self.privLevel = PnAuthRule.edit
        if privToken == 'manage':
            self.privLevel = PnAuthRule.manage
        if self.privLevel == 0:
            raise Exception('Invalid privilege token')
        self.userMatch = re.compile(self.userPattern)
        self.dataSetMatch = re.compile(self.dataSetPattern)

    def Match(self, credInfo, dataSet, level):
        if (self.dataSetMatch.match(dataSet)) and (self.privLevel >= level):
            if self.userMatch.match(credInfo.userid):
                return True
            for groupid in credInfo.groupids:
                if self.userMatch.match(groupid):
                    return True
        return False



class PnAuthRuleSet(object):

    def __init__(self):
        self.rules = []
        linenr = 0
        with open(authFileName) as fp:
            for line in fp:
                line = line.strip()
                linenr += 1
                if (len(line) > 1) and (line[0] != '#'):
                    lineTokens = line.split(',')
                    if len(lineTokens) != 3:
                        raise Exception('ERROR: Invalid authority file: line '+str(linenr))
                    (userPattern, dataSetPattern, privToken) = lineTokens
                    try:
                        self.rules.append(PnAuthRule(userPattern.strip(), dataSetPattern.strip(), privToken.strip()))
                    except Exception as e:
                        raise Exception('Invalid authorization file line: {line} ({error})'.format(line=line, error=str(e)))


    def Match(self, credInfo, databaseName, level):
        for rule in self.rules:
            if rule.Match(credInfo, databaseName, level):
                return True
        return False

