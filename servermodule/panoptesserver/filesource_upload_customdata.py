# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import os
import config
import DQXDbTools
import authorization
import shutil


def response(returndata):

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    fileid = DQXDbTools.ToSafeIdentifier(returndata['fileid'])
    sourceid = DQXDbTools.ToSafeIdentifier(returndata['sourceid'])

    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))

    for char in ['.', ' ', ',', '/']:
        sourceid = sourceid.replace(char, '_')


    baseFolder = config.SOURCEDATADIR + '/datasets'

    filename = os.path.join(config.BASEDIR, 'Uploads', DQXDbTools.ToSafeIdentifier(fileid))
    destFolder = os.path.join(baseFolder, databaseName, 'workspaces', workspaceid, 'customdata', tableid, sourceid)

    try:
        if not os.path.exists(destFolder):
            os.makedirs(destFolder)
        shutil.copyfile(filename, os.path.join(destFolder, 'data'))

        dataFileName = os.path.join(destFolder, 'settings')
        if not os.path.exists(dataFileName):
            with open(dataFileName, 'w') as fp:
                fp.write('AutoScanProperties: true\n')

    except Exception as e:
        returndata['Error'] = str(e)

    os.remove(filename)

    returndata['sourceid'] = sourceid
    return returndata