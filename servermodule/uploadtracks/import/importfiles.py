import os
import DQXDbTools
#import MySQLdb
import yaml
import config
import simplejson



class SettingsLoader:
    def __init__(self, fileName):
        self.fileName = fileName
        self.knownTokens = []

    def AddRequired(self, token):
        self.knownTokens.append(token)

    def Load(self):
        with open(self.fileName, 'r') as configfile:
            self.settings = yaml.load(configfile.read())
        for token in self.knownTokens:
            if token not in self.settings:
                raise Exception('Missing token "{0}" in file "{1}"'.format(token, self.fileName))
        return self.settings

    def AddIfMissing(self, token, value):
        self._CheckLoaded()
        if token not in self.settings:
            self.settings[token] = value


    def _CheckLoaded(self):
        if self.settings is None:
            raise Exception('Settings not loaded')

    def __getitem__(self, item):
        self._CheckLoaded()
        return self.settings[item]

    def Get(self):
        self._CheckLoaded()
        return self.settings

    def ToJSON(self):
        self._CheckLoaded()
        return simplejson.dumps(self.settings)




def ExecuteSQL(database, command):
    db = DQXDbTools.OpenDatabase(database)
    db.autocommit(True)
    cur = db.cursor()
    cur.execute(command)
    cur.close()
    db.close()



def ImportDataTable(datasetId, tableid, folder):
    print('==================================================================')
    print('IMPORTING DATATABLE {0} from {1}'.format(tableid, folder))
    print('==================================================================')


    settings = SettingsLoader(os.path.join(os.path.join(folder, 'settings')))
    settings.AddRequired('NameSingle')
    settings.AddRequired('NamePlural')
    settings.AddRequired('PrimKey')
    settings.AddRequired('IsPositionOnGenome')
    settings.Load()

    # Add to tablecatalog
    settingsString = settings.ToJSON()
    sql = "INSERT INTO tablecatalog VALUES ('{0}', '{1}', '{2}', {3}, '{4}')".format(
        tableid,
        settings['NamePlural'],
        settings['PrimKey'],
        settings['IsPositionOnGenome'],
        settingsString
    )
    ExecuteSQL(datasetId, sql)


    # Load & create properties
    properties = []
    for fle in os.listdir(os.path.join(folder, 'properties')):
        if os.path.isfile(os.path.join(folder, 'properties', fle)):
            properties.append(fle)
    print('Properties: '+str(properties))

    for propid in properties:
        settings = SettingsLoader(os.path.join(os.path.join(folder, 'properties', propid)))
        settings.AddRequired('Name')
        settings.AddRequired('DataType')
        settings.Load()
        settings.AddIfMissing('Order', 99999)
        settingsString = settings.ToJSON()
        sql = "INSERT INTO propertycatalog VALUES ('', 'fixed', '{0}', '{1}', '{2}', '{3}', {4}, '{5}')".format(
            settings['DataType'],
            propid,
            tableid,
            settings['Name'],
            settings['Order'],
            settingsString
        )
        ExecuteSQL(datasetId, sql)





def ImportDataSet(baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    datasetFolder = os.path.join(baseFolder, datasetId)
    indexDb = 'datasetindex'

    globalSettings = SettingsLoader(os.path.join(datasetFolder, 'settings'))
    globalSettings.AddRequired('Name')
    globalSettings.Load()
    print('Global settings: '+str(globalSettings.Get()))


    # Dropping existing database
    print('Dropping database')
    ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    print('Creating new database')
    with open('createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ExecuteSQL(datasetId, sqlCreateCommands)

    #ExecuteSQL(datasetId, 'INSERT INTO workspaces VALUES ("a1", "b1")')#!!! temporary test. todo: remove

    datatables = []
    for dir in os.listdir(os.path.join(datasetFolder,'datatables')):
        if os.path.isdir(os.path.join(datasetFolder, 'datatables', dir)):
            datatables.append(dir)
    print('Data tables: '+str(datatables))
    for datatable in datatables:
        ImportDataTable(datasetId, datatable, os.path.join(datasetFolder, 'datatables', datatable))


    # Finalise: register dataset
    print('Registering data set')
    ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet('/home/pvaut/WebstormProjects/panoptes/sampledata/datasets')