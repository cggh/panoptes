import DQXDbTools
import config
import re
import os


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

    if operation.OnDatabase(config.DB):
        if operation.OnTable('storedviews'):
            return DQXDbTools.DbAuthorization(True)
    if operation.OnTable('storedqueries'):
        return DQXDbTools.DbAuthorization(True)
    if operation.OnColumn('StoredSelection'):
        return DQXDbTools.DbAuthorization(True)

    authRules = GetPnAuthRules()

    if not(operation.IsModify()):
        # Check if any of the rules allows reading
        for rule in authRules:
            if rule.Match(credInfo, operation.databaseName, PnAuthRule.read):
                return DQXDbTools.DbAuthorization(True)
        return DQXDbTools.DbAuthorization(False, 'The login used does not allow you to perform this change.')

    for rule in authRules:
        if rule.Match(credInfo, operation.databaseName, PnAuthRule.manage):
            return DQXDbTools.DbAuthorization(True)
    return DQXDbTools.DbAuthorization(False, 'The login used does not allow you to perform this change.')






class PnAuthRule:
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
        if self.userMatch.match(credInfo.userid):
            if self.dataSetMatch.match(dataSet):
                if self.privLevel >= level:
                    return True
        return False

def GetPnAuthRules():
    rules = []
    with open(authFileName) as fp:
        for line in fp:
            line = line.strip()
            if (len(line) > 1) and (line[0] != '#'):
                lineTokens = line.split(',')
                if len(lineTokens) != 3:
                    raise Exception('ERROR: Invalid authority file')
                (userPattern, dataSetPattern, privToken) = lineTokens
                rules.append(PnAuthRule(userPattern.strip(), dataSetPattern.strip(), privToken.strip()))
    return rules