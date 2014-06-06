# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import time
import config
import DQXDbTools
import authorization


def response(returndata):

    def GetLastModifiedFileInTree(folder):
        maxtime = 0
        try:
            for item in os.listdir(folder):
                if os.path.isdir(os.path.join(folder, item)):
                    maxtime = max(maxtime, GetLastModifiedFileInTree(os.path.join(folder, item)))
                else:
                    maxtime = max(maxtime, os.path.getmtime(os.path.join(folder, item)))
        except Exception:
            pass
        return maxtime

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    # Obtain info about last import actions for all datasets
    db = DQXDbTools.OpenDatabase(credInfo)
    cur = db.cursor()
    datasetImportTimes = {}
    try:
        cur.execute('SELECT id,importtime FROM datasetindex')
        for row in cur.fetchall():
            if credInfo.CanDo(DQXDbTools.DbOperationRead(row[0])):
                if (row[1] is not None) and (len(row[1]) > 0):
                    datasetImportTimes[row[0]] = float(row[1])
                else:
                    datasetImportTimes[row[0]] = 0
    except Exception as e:
        returndata['Error'] = 'Unable to obtain import time data\n(' + str(e) +')'
        return returndata

    try:
        baseFolder = config.SOURCEDATADIR + '/datasets'
        datasets = {}
        for datasetid in os.listdir(baseFolder):
            if os.path.isdir(os.path.join(baseFolder, datasetid)):
                if authorization.CanDo(credInfo, DQXDbTools.DbOperationWrite(datasetid, 'workspaces')).IsGranted():
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
                    # Fetch info about datatables
                    datatables = {}
                    if os.path.exists(os.path.join(baseFolder, datasetid, 'datatables')):
                        for tableid in os.listdir(os.path.join(baseFolder, datasetid, 'datatables')):
                            if os.path.isdir(os.path.join(baseFolder, datasetid, 'datatables', tableid)):
                                datatables[tableid] = {}
                    datasets[datasetid]['datatables'] = datatables
                    importStatus = 'absent'
                    lastModifiedTime = GetLastModifiedFileInTree(os.path.join(baseFolder, datasetid))
                    if datasetid in datasetImportTimes:
                        importStatus = 'outdated'
                        if datasetImportTimes[datasetid] > lastModifiedTime:
                            importStatus = 'ok'
                    datasets[datasetid]['importstatus'] = importStatus
        returndata['datasets'] = datasets
    except Exception as e:
        returndata['Error'] = str(e)


    return returndata