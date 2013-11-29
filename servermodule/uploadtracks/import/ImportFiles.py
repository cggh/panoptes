import os
import DQXDbTools
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



def ImportDataSet(baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    datasetFolder = os.path.join(baseFolder, datasetId)
    indexDb = 'datasetindex'

    globalSettings = SettingsLoader.SettingsLoader(os.path.join(datasetFolder, 'settings'))
    globalSettings.RequireTokens(['Name'])
    print('Global settings: '+str(globalSettings.Get()))


    # Dropping existing database
    print('Dropping database')
    ImpUtils.ExecuteSQL(indexDb, 'DELETE FROM datasetindex WHERE id="{0}"'.format(datasetId))
    try:
        ImpUtils.ExecuteSQL(indexDb, 'DROP DATABASE IF EXISTS {0}'.format(datasetId))
    except:
        pass
    ImpUtils.ExecuteSQL(indexDb, 'CREATE DATABASE {0}'.format(datasetId))


    # Creating new database
    print('Creating new database')
    with open('createdataset.sql', 'r') as content_file:
        sqlCreateCommands = content_file.read()
    ImpUtils.ExecuteSQL(datasetId, sqlCreateCommands)

    # Global settings
    print('Defining global settings')
    ImpUtils.ImportGlobalSettings(datasetId, globalSettings)


    datatables = []
    for dir in os.listdir(os.path.join(datasetFolder,'datatables')):
        if os.path.isdir(os.path.join(datasetFolder, 'datatables', dir)):
            datatables.append(dir)
    print('Data tables: '+str(datatables))
    for datatable in datatables:
        ImportDataTable.ImportDataTable(datasetId, datatable, os.path.join(datasetFolder, 'datatables', datatable))

    ImportRefGenome.ImportRefGenome(datasetId, os.path.join(datasetFolder, 'refgenome'))

    ImportWorkspaces.ImportWorkspaces(datasetFolder, datasetId)

    # Finalise: register dataset
    print('Registering data set')
    ImpUtils.ExecuteSQL(indexDb, 'INSERT INTO datasetindex VALUES ("{0}", "{1}")'.format(datasetId, globalSettings['Name']))



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet(config.SOURCEDATADIR + '/datasets')