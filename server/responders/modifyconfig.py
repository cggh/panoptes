from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import json
from .importer import configReadWrite

# curl -H "content-Type: application/json" -X POST -d '{"propertyGroups":[{"id":"Value", "name":"WTF"}]' 'http://localhost:8000/api?datatype=custom&respmodule=panoptesserver&respid=setconfig&dataset=Samples_and_Variants&action=merge&path=tablesById.variants'

def response(returndata):
    DQXDbTools.CredentialInformation(returndata).VerifyCanDo(DQXDbTools.DbOperationWrite(returndata['dataset']))
    action = returndata['action'] # replace, merge or delete
    path = returndata['path']
    datasetId = returndata['dataset']
    try:
        length = int(returndata['environ'].get('CONTENT_LENGTH', '0'))
    except ValueError:
        length = 0
    content = returndata['environ']['wsgi.input'].read(length).decode('utf-8')
    content = json.loads(content) if len(content) > 0 else None
    sendBackDocs = configReadWrite.writeJSONConfig(datasetId, action, path, content)
    sendBack = configReadWrite.readJSONConfig(returndata['dataset'])
    if sendBackDocs:
        sendBack['docs'].update(sendBackDocs)
    returndata['config'] = sendBack
    return returndata


if __name__ == "__main__":
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'replace', 'tablesById.variants.defaultQuery', 'QUERY')
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'delete', 'tablesById.variants.defaultQuery', '')
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'merge', 'tablesById.variants.defaultQuery', 'QUERY')
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'merge', 'tablesById.variants', {'defaultQuery':'QUERY'})
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'delete', 'tablesById.variants.defaultQuery', '')
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'delete', 'tablesById.variants.defaultQuery', '')
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'replace', 'tablesById.variants.storedQueries', [{'name':'BEN', 'query':'QUERY'}])
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'merge', 'tablesById.variants.storedQueries', [{'name': 'BEN2', 'query': 'QUERY2'}])
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'merge', 'tablesById.variants.storedQueries.1', {'name': 'BEN2mod', 'query': 'QUERY2mod'})
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'delete', 'tablesById.variants.storedQueries.1', None)
    configReadWrite.writeJSONConfig('Samples_and_Variants', 'replace', 'tablesById.variants.properties.0.name',
                                'BEN')
    # configReadWrite.writeJSONConfig('Samples_and_Variants', 'replace', 'chromosomes.wat', 'BEN')
