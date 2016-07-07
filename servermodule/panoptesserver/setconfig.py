# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import json
from importer import readConfig

def response(returndata):
    try:
        length = int(returndata['environ'].get('CONTENT_LENGTH', '0'))
    except ValueError:
        length = 0
    content = json.loads((returndata['environ']['wsgi.input'].read(length)))
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationRead(returndata['dataset']))

    #Based on path load a subset of settings then merge in new, verify and save

    return returndata
