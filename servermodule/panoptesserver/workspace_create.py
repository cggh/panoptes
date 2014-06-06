# This file is part of Panoptes - © Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

# import DQXDbTools
# import uuid
# import os
# import config
# import asyncresponder
# import Utils
#
# def ResponseExecute(data, calculationObject):
#     databaseName = DQXDbTools.ToSafeIdentifier(data['database'])
#     workspaceId = DQXDbTools.ToSafeIdentifier(data['id'])
#     workspaceName = DQXDbTools.ToSafeIdentifier(data['name'])
#
#     credInfo = calculationObject.credentialInfo
#     db = DQXDbTools.OpenDatabase(credInfo, databaseName)
#     credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(databaseName, 'workspaces'))
#     cur = db.cursor()
#
#     cur.execute('SELECT id, primkey FROM tablecatalog')
#     tables = [ { 'id': row[0], 'primkey': row[1] } for row in cur.fetchall()]
#
#
#     calculationObject.SetInfo('Setting up workspace: create tables')
#     for table in tables:
#         tableid = table['id']
#         cur.execute("CREATE TABLE {0} AS SELECT {1} FROM {2}".format(Utils.GetTableWorkspaceProperties(workspaceId,tableid), table['primkey'], tableid) )
#         calculationObject.SetInfo('Setting up workspace: create index')
#         cur.execute("create unique index {1} on {0}({1})".format(Utils.GetTableWorkspaceProperties(workspaceId,tableid), table['primkey']) )
#
#
#     cur.execute("INSERT INTO workspaces VALUES (%s,%s)", (workspaceId, workspaceName) )
#     for table in tables:
#         Utils.UpdateTableInfoView(workspaceId, table['id'], cur)
#
#
#     db.commit()
#     db.close()
#
#
#
#
# def response(returndata):
#     returndata['id']='WS'+str(uuid.uuid1()).replace('-', '_')
#     return asyncresponder.RespondAsync(ResponseExecute, returndata, "Create new workspace")
#
