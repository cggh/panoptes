from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import json
from .importer import configReadWrite


def response(returndata):
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationWrite(returndata['dataset']))
    path = returndata['path'] #dot seperated path to yaml e.g. tablesById.variants
    datasetId = returndata['dataset']
    try:
        length = int(returndata['environ'].get('CONTENT_LENGTH', '0'))
    except ValueError:
        length = 0
    content = returndata['environ']['wsgi.input'].read(length).decode('utf-8')
    configReadWrite.writeYAMLConfig(datasetId, path, content)
    sendBack = configReadWrite.readJSONConfig(returndata['dataset'])
    returndata['config'] = sendBack
    return returndata
