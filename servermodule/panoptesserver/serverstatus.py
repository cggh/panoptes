# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import config
import os
import uuid
import DQXDbTools
import authorization

def response(returndata):

    def CheckFolderExistence(dir, name, needWriteAccess):
        if not os.path.isdir(dir):
            raise Exception('{0} does not exist\n({1})'.format(name, dir))
        if needWriteAccess:
            try:
                tryFileName = os.path.join(dir, str(uuid.uuid1()))
                with open(tryFileName, 'w'):
                    pass
                os.remove(tryFileName)
            except:
                raise Exception('Unable to write to {0}\n({1})'.format(name, dir))


    try:

        # Checks for server database
        credInfo = DQXDbTools.ParseCredentialInfo(returndata)
        try:
            db = DQXDbTools.OpenDatabase(credInfo)
        except Exception as e:
            raise Exception('Unable to access server database.\n' + str(e))
        try:
            cur = db.cursor()
            cur.execute('SELECT id,name FROM datasetindex')
        except Exception as e:
            raise Exception('Unable to access server database index.\n' + str(e))

        # Checks for DQXServer BASEDIR
        CheckFolderExistence(config.BASEDIR, '[BASEDIR]', False)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'temp'), '[BASEDIR]/temp', True)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'Uploads'), '[BASEDIR]/Uploads', True)
        CheckFolderExistence(os.path.join(config.BASEDIR, 'SummaryTracks'), '[BASEDIR]/SummaryTracks', True)

        # Checks for source data folder
        CheckFolderExistence(os.path.join(config.SOURCEDATADIR, 'datasets'), '[SOURCEDATADIR]/datasets', False)

        # Try getting auth rules
        authorization.PnAuthRuleSet()

        print('PANOPTES CLIENT APP START: ' + credInfo.GetAuthenticationInfo())
        returndata['userid'] = credInfo.GetUserId()


    except Exception as e:
        print('SERVER CONFIGURATION ERROR: ' + str(e))
        returndata['issue'] = str(e)

    return returndata
