import os
import DQXDbTools
#import MySQLdb
import yaml
import config



class SettingsLoader:
    def __init__(self, fileName):
        self.fileName = fileName
        self.knownTokens = []

    def AddRequired(self, token):
        self.knownTokens.append(token)

    def Load(self):
        with open(self.fileName, 'r') as configfile:
            st = yaml.load(configfile.read())
        for token in self.knownTokens:
            if token not in st:
                raise Exception('Missing token "{0}" in file "{1}"'.format(token, self.fileName))
        return st

def ExecuteSQL(database, command):
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()



def ImportDataSet(baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    datasetFolder = os.path.join(baseFolder, datasetId)
    indexDb = 'datasetindex'

    loader = SettingsLoader(os.path.join(datasetFolder, 'settings'))
    loader.AddRequired('Name')
    globalSettings = loader.Load()
    print('Global settings: '+str(globalSettings))


    # Dropping existing database
    print('Dropping database')
    ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    with open('createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ExecuteSQL(datasetId, sqlCreateCommands)

    ExecuteSQL(datasetId, 'INSERT INTO workspaces VALUES ("a1", "b1")')#!!! temporary test. todo: remove

    # Finalise: register dataset
    ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet('/home/pvaut/WebstormProjects/panoptes/sampledata/datasets')