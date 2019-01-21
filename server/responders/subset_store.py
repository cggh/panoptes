from __future__ import absolute_import
from __future__ import division
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

from past.utils import old_div
import DQXDbTools
import DQXUtils
from . import asyncresponder
import os
import config
import Utils
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC


def ResponseExecute(returndata, calculationObject):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    keyid = DQXDbTools.ToSafeIdentifier(returndata['keyid'])
    isNumericalKey = int(DQXDbTools.ToSafeIdentifier(returndata['isnumericalkey'])) > 0
    dataid = DQXDbTools.ToSafeIdentifier(returndata['dataid'])
    subsetid = DQXDbTools.ToSafeIdentifier(returndata['subsetid'])
    method = DQXDbTools.ToSafeIdentifier(returndata['method'])

    if method not in ['add', 'replace', 'remove']:
        raise Exception('Invalid store selection method')

    calculationObject.Log('==== storing subset')

    filename = os.path.join(config.BASEDIR, 'temp', 'store_'+dataid)
    with open(filename, 'r') as fp:
        datastring = fp.read()
    os.remove(filename)

    if not(isNumericalKey):
        valuesString = '("{0}", {1})'
        deleteString = '"{0}"'
    else:
        valuesString = '({0}, {1})'
        deleteString = '{0}'
    subsetTable = tableid + '_subsets'



    with DQXDbTools.DBCursor(calculationObject.credentialInfo, databaseName) as cur:
        cur.credentials.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'storedsubsets'))
        # sqlstring = 'INSERT INTO {0} VALUES ()'.format(DBTBESC(tableName), DBCOLESC(propid))
        # cur.execute(sqlstring)
        # cur.commit()


        if method == 'remove':
            if len(datastring) > 0:
                keys = datastring.split('\t')
                def delkeys(keylist):
                    if len(keylist) > 0:
                        keystr = ', '.join([deleteString.format(key) for key in keylist])
                        sqlstring = "DELETE FROM {0} WHERE (subsetid={1}) AND ({2} IN ({3}))".format(DBTBESC(subsetTable), subsetid, DBCOLESC(keyid), keystr)
                        cur.execute(sqlstring)
                        cur.commit()
                keysublist = []
                keyNr = 0
                for key in keys:
                    keysublist.append(key)
                    if len(keysublist) >= 200:
                        delkeys(keysublist)
                        keysublist = []
                        calculationObject.SetInfo('Removing', old_div(keyNr*1.0,len(keys)))
                    keyNr += 1
                delkeys(keysublist)


        if (method == 'replace') or (method == 'add'):

            if method == 'replace':
                cur.execute('DELETE FROM {0} WHERE subsetid={1}'.format(DBTBESC(subsetTable), subsetid))
                cur.commit()

            existingRecordMap = {}
            if method == 'add':
                calculationObject.Log('Determining current subset content...')
                cur.execute('SELECT {0} FROM {1} WHERE subsetid={2}'.format(DBCOLESC(keyid), DBTBESC(subsetTable), subsetid))
                for row in cur.fetchall():
                    existingRecordMap[row[0]] = True

            if len(datastring) > 0:
                keys = datastring.split('\t')
                def submitkeys(keylist):
                    if len(keylist) > 0:
                        sqlstring = "INSERT INTO {0} VALUES ".format(DBTBESC(subsetTable))
                        sqlstring += ', '.join([valuesString.format(key, subsetid) for key in keylist])
                        cur.execute(sqlstring)
                        cur.commit()
                keysublist = []
                keyNr = 0
                for key in keys:
                    if key not in existingRecordMap:
                        keysublist.append(key)
                        if len(keysublist) >= 500:
                            submitkeys(keysublist)
                            keysublist = []
                            calculationObject.SetInfo('Storing', old_div(keyNr*1.0,len(keys)))
                        keyNr += 1
                submitkeys(keysublist)

        maxcount = 50000
        cur.execute('SELECT count(*) FROM (SELECT * FROM {membertable} WHERE subsetid={subsetid} LIMIT {maxcount}) AS _tmptable_'.format(
            membertable=DBTBESC(subsetTable),
            subsetid=subsetid,
            maxcount=maxcount+1
        ))
        count = int(cur.fetchone()[0])

        return {
            'membercount': count
        }



def response(returndata):
    retval = asyncresponder.RespondAsync(
        ResponseExecute,
        returndata,
        "Store subset"
    )
    return retval
