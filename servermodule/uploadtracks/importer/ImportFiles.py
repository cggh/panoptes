import os
import DQXDbTools
import DQXUtils
import config
import sys
import customresponders.uploadtracks.VTTable as VTTable
import SettingsLoader
import ImpUtils
import uuid
import shutil
import customresponders.uploadtracks.Utils as Utils

import ImportDataTable
import ImportRefGenome
import ImportWorkspaces



def ImportDataSet(calculationObject, baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    DQXUtils.CheckValidIdentifier(datasetId)
    datasetFolder = os.path.join(baseFolder, datasetId)
    indexDb = 'datasetindex'

    #raise Exception('Something went wrong')


    globalSettings = SettingsLoader.SettingsLoader(os.path.join(datasetFolder, 'settings'))
    globalSettings.RequireTokens(['Name'])
    print('Global settings: '+str(globalSettings.Get()))



    # Dropping existing database
    calculationObject.SetInfo('Dropping database')
    print('Dropping database')
    ImpUtils.ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ImpUtils.ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ImpUtils.ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    scriptPath = os.path.dirname(os.path.realpath(__file__))
    calculationObject.SetInfo('Creating database')
    print('Creating new database')
    with open(scriptPath + '/createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ImpUtils.ExecuteSQL(datasetId, sqlCreateCommands)

    # Global settings
    print('Defining global settings')
    ImpUtils.ImportGlobalSettings(calculationObject, datasetId, globalSettings)


    datatables = []
    for dir in os.listdir(os.path.join(datasetFolder,'datatables')):
        if os.path.isdir(os.path.join(datasetFolder, 'datatables', dir)):
            datatables.append(dir)
    print('Data tables: '+str(datatables))
    for datatable in datatables:
        ImportDataTable.ImportDataTable(calculationObject, datasetId, datatable, os.path.join(datasetFolder, 'datatables', datatable))

    ImportRefGenome.ImportRefGenome(calculationObject, datasetId, os.path.join(datasetFolder, 'refgenome'))

    ImportWorkspaces.ImportWorkspaces(calculationObject, datasetFolder, datasetId)

    # Finalise: register dataset
    print('Registering data set')
    ImpUtils.ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(calculationObject, baseFolder, dataset)






#ImportFileSet(config.SOURCEDATADIR + '/datasets')
#ImportDataSet(config.SOURCEDATADIR + '/datasets', 'Sample')