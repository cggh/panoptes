import os
import config


def response(returndata):

    try:
        baseFolder = config.SOURCEDATADIR + '/datasets'
        datasets = {}
        for datasetid in os.listdir(baseFolder):
            if os.path.isdir(os.path.join(baseFolder, datasetid)):
                datasets[datasetid] = { 'workspaces': {} }
                if os.path.exists(os.path.join(baseFolder, datasetid, 'workspaces')):
                    for wsid in os.listdir(os.path.join(baseFolder, datasetid, 'workspaces')):
                        if os.path.isdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid)):
                            workspace = { 'sources': {} }
                            datasets[datasetid]['workspaces'][wsid] = workspace
                            if os.path.exists(os.path.join(baseFolder, datasetid, 'workspaces', wsid, 'customdata')):
                                for tableid in os.listdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid, 'customdata')):
                                    if os.path.isdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid, 'customdata', tableid)):
                                        for sourceid in os.listdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid, 'customdata', tableid)):
                                            if os.path.isdir(os.path.join(baseFolder, datasetid, 'workspaces', wsid, 'customdata', tableid, sourceid)):
                                                workspace['sources'][sourceid] = { 'tableid': tableid }
        returndata['datasets'] = datasets
    except Exception as e:
        returndata['Error'] = str(e)


    return returndata