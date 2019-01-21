# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from builtins import str
import os
import config
import DQXDbTools
import DQXbase64


def response(returndata):

    credInfo = DQXDbTools.CredentialInformation(returndata)
    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    baseFolder = config.SOURCEDATADIR + '/datasets'
    settingsFile = os.path.join(baseFolder, databaseName, 'refgenome', 'settings')

    try:
        if not os.path.exists(settingsFile):
            returndata['content'] = DQXbase64.b64encode_var2('AnnotMaxViewPortSize: 750000  # Maximum viewport (in bp) the genome browser can have in order to show the annotation track\nRefSequenceSumm: No          # Include a summary track displaying the reference sequence\n')
        else:
            with open(settingsFile, 'r') as fp:
                content = fp.read()
                returndata['content'] = DQXbase64.b64encode_var2(content)

    except Exception as e:
        returndata['Error'] = str(e)

    return returndata