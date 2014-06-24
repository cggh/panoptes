# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import uuid
import re

def GetTempID():
    return 'TMP'+str(uuid.uuid1()).replace('-', '_')

def GetTableWorkspaceProperties(workspaceid, tableid):
    return "{0}INFO_{1}".format(tableid, workspaceid)

def GetTableWorkspaceView(workspaceid, tableid):
    return "{0}CMB_{1}".format(tableid, workspaceid)

def GetTableWorkspaceViewSubSampling(workspaceid, tableid):
    return "{0}CMBSORTRAND_{1}".format(tableid, workspaceid)

def GetTablePrimKey(tableid, cur):
    cur.execute('SELECT primkey FROM tablecatalog WHERE (id="{0}")'.format(tableid))
    return cur.fetchone()[0]

def UpdateTableInfoView(workspaceid, tableid, allowsubsampling, cur):

    propertiesTable = GetTableWorkspaceProperties(workspaceid, tableid)
    viewName = GetTableWorkspaceView(workspaceid, tableid)

    # Creating list of all custom properties
    cur.execute('SELECT propid FROM propertycatalog WHERE (workspaceid="{0}") and (source="custom") and (tableid="{1}")'.format(workspaceid, tableid))
    properties = [ row[0] for row in cur.fetchall() ]

    primkey = GetTablePrimKey(tableid, cur)

    sql = "create or replace view {0} as select {1}.*".format(viewName,tableid)
    for propid in properties:
        sql += ", {0}.{1}".format(propertiesTable, propid)
    sql += " from {0} left join {1} on {0}.{2}={1}.{2}".format(tableid, propertiesTable, primkey)
    print('SQL:' + sql)
    cur.execute(sql)

    if allowsubsampling:
        #Create view for subsampling
        tableid_subsampl = tableid + '_SORTRAND'
        viewName_subsampl = GetTableWorkspaceViewSubSampling(workspaceid, tableid)
        sql = "create or replace view {0} as select {1}.*".format(viewName_subsampl, tableid_subsampl)
        for propid in properties:
            sql += ", {0}.{1}".format(propertiesTable, propid)
        sql += " from {0} left join {1} on {0}.{2}={1}.{2}".format(tableid_subsampl, propertiesTable, primkey)
        print('SQL:' + sql)
        cur.execute(sql)