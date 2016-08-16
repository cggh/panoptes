# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
#import os
#import config
#import datetime
#from DQXDbTools import DBCOLESC
#from DQXDbTools import DBTBESC


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    maxcount = int(returndata['maxcount'])
    sortby = DQXDbTools.ToSafeIdentifier(returndata['sortby'])
    tableid = DQXDbTools.ToSafeIdentifier(returndata['tableid'])
    searchtext = ''
    if 'searchtext' in returndata:
        searchtext = DQXDbTools.ToSafeIdentifier(returndata['searchtext'])

    # We want to add a wildcard so that partial words are searched for
    if len(searchtext) > 0:
        searchtext = ' '.join([word + '*' for word in searchtext.split(' ')])


    notes_id = []
    notes_tableid = []
    notes_itemid = []
    notes_timestamp = []
    notes_userid = []
    notes_content = []
    with DQXDbTools.DBCursor(returndata, databaseName) as cur:

        whereclauses = []
        if len(searchtext) > 0:
            whereclauses.append("MATCH(`content`) AGAINST ('{searchtext}' IN BOOLEAN MODE)".format(searchtext=searchtext))
        if tableid != '_all_':
            whereclauses.append("`tableid`='{tableid}'".format(tableid=tableid))

        sql = "SELECT `id`, `tableid`, `itemid`, `timestamp`, `userid`, `content` FROM notes"
        if len(whereclauses) > 0:
            sql += ' WHERE ' + ' AND '.join(whereclauses)

        if sortby == 'date':
            sql += ' ORDER BY `timestamp` DESC'

        sql += ' LIMIT {0}'.format(maxcount)
        #print(sql)
        try: #Note: we need to be prepared for MySQL exceptions because we may encounter invalid search syntaxes
            cur.execute(sql)
            for row in cur.fetchall():
                notes_id.append(row[0])
                notes_tableid.append(row[1])
                notes_itemid.append(row[2])
                notes_timestamp.append(row[3])
                notes_userid.append(row[4])
                content = row[5]
                notes_content.append((content[:300] + '...') if len(content) > 300 else content)
        except:
            pass

    returndata['notes_id'] = notes_id
    returndata['notes_tableid'] = notes_tableid
    returndata['notes_itemid'] = notes_itemid
    returndata['notes_timestamp'] = notes_timestamp
    returndata['notes_userid'] = notes_userid
    returndata['notes_content'] = notes_content

    return returndata