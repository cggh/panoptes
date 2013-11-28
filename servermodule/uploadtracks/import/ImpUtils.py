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


def ExecuteSQLScript(filename, databaseName):
    cmd = config.mysqlcommand + " -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, filename)
    os.system(cmd)

class SQLScript:
    def __init__(self):
        self.commands = []

    def AddCommand(self, cmd):
        self.commands.append(cmd)

    def Execute(self, databaseName):
        filename = GetTempFileName()
        fp = open(filename, 'w')
        for cmd in self.commands:
            fp.write(cmd+';\n')
        fp.close()
        ExecuteSQLScript(filename, databaseName)
        os.remove(filename)




def ExecuteSQL(database, command):
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()

def RunConvertor(name, runpath, arguments):
    os.chdir(runpath)
    path_DQXServer = DQXUtils.GetDQXServerPath()
    scriptPath = os.path.join(path_DQXServer, 'Convertors')
    cmd = config.pythoncommand + ' ' + scriptPath + '/' + name + '.py '+' '.join([str(a) for a in arguments])
    print('EXECUTING COMMAND '+cmd)
    os.system(cmd)

def ExecuteFilterbankSummary(destFolder, id, settings):
    RunConvertor('_CreateSimpleFilterBankData', destFolder,
                 [
                     id,
                     settings['MinVal'],
                     settings['MaxVal'],
                     settings['BlockSizeMin'],
                     2,
                     settings['BlockSizeMax']
                ]
    )

def ImportGlobalSettings(datasetId, settings):
    for token in settings.GetTokenList():
        ExecuteSQL(datasetId, 'INSERT INTO settings VALUES ("{0}", "{1}")'.format(token, settings[token]))


