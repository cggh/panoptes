import os
import DQXDbTools
#import MySQLdb


def ImportDataSet(baseFolder, datasetId):
    print('==================================================================')
    print('IMPORTING DATASET {0}'.format(datasetId))
    print('==================================================================')
    datasetFolder = os.path.join(baseFolder, datasetId)

    db = DQXDbTools.OpenDatabase(None)
    cur = db.cursor()

    cur.execute('CREATE DATABASE {0}'.format(datasetId))

    cur.close()
    db.close()



def ImportFileSet(baseFolder):
    datasets = []
    for dir in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, dir)):
            datasets.append(dir)
    for dataset in datasets:
        ImportDataSet(baseFolder, dataset)






ImportFileSet('/home/pvaut/WebstormProjects/panoptes/sampledata/datasets')