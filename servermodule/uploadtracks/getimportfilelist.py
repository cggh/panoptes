import os
import config


def response(returndata):

    baseFolder = config.SOURCEDATADIR + '/datasets'
    datasets = {}
    for datasetid in os.listdir(baseFolder):
        if os.path.isdir(os.path.join(baseFolder, datasetid)):
            datasets[datasetid] = { 'workspaces': {}}
            for wsid in os.listdir(os.path.join(baseFolder, datasetid, 'workspaces')):
                if os.path.isdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid)):
                    datasets[datasetid]['workspaces'][wsid] = {}

    returndata['datasets'] = datasets

    return returndata