import os
import config
import uuid
import DQXDbTools
import DQXUtils

def convertToBooleanInt(vl):
    if vl is None:
        return None
    if (vl.lower() == 'true') or (vl.lower() == 'yes') or (vl.lower() == 'y') or (vl == '1') or (vl == '1.0'):
        return 1
    if (vl.lower() == 'false') or (vl.lower() == 'no') or (vl.lower() == 'n') or (vl == '0') or (vl == '0.0'):
        return 0
    return None


def GetTempFileName():
    return os.path.join(config.BASEDIR,'temp','TMP'+str(uuid.uuid1()).replace('-', '_'))


def ExecuteSQLScript(calculationObject, filename, databaseName):
    calculationObject.LogSQLCommand(databaseName+':SQL file')
    if not os.path.exists(filename):
        raise Exception('Unable to find SQL file '+filename)
    cmd = config.mysqlcommand + " -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, filename)
    os.system(cmd)

class SQLScript:
    def __init__(self, calculationObject):
        self.commands = []
        self.calculationObject = calculationObject

    def AddCommand(self, cmd):
        self.commands.append(cmd)

    def Execute(self, databaseName):
        filename = GetTempFileName()
        fp = open(filename, 'w')
        for cmd in self.commands:
            fp.write(cmd+';\n')
        fp.close()
        ExecuteSQLScript(self.calculationObject, filename, databaseName)
        os.remove(filename)




def ExecuteSQL(calculationObject, database, command):
    calculationObject.LogSQLCommand(database+';'+command)
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()

def RunConvertor(calculationObject, name, runpath, arguments):
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptFile = os.path.join(path_DQXServer, 'Convertors', name + '.py')
    calculationObject.RunPythonScript(scriptFile, runpath, arguments)


def ExecuteFilterbankSummary(calculationObject, destFolder, id, settings):
    RunConvertor(calculationObject, '_CreateSimpleFilterBankData', destFolder,
                 [
                     id,
                     settings['MinVal'],
                     settings['MaxVal'],
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax']
                ]
    )

def ImportGlobalSettings(calculationObject, datasetId, settings):
    for token in settings.GetTokenList():
        ExecuteSQL(calculationObject, datasetId, 'INSERT INTO settings VALUES ("{0}", "{1}")'.format(token, settings[token]))


