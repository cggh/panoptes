import DQXDbTools
import uuid
import os
import config
from DQXTableUtils import VTTable


def response(returndata):

    databaseName = returndata['database']
    trackid = returndata['trackid']
    name = returndata['name']
    properties = returndata['properties']

    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    cur = db.cursor()

    credInfo.VerifyCanModifyDatabase(databaseName, 'customtracks')
    cur.execute("UPDATE customtracks SET name=%s WHERE ID=%s", (name,trackid) )
    cur.execute("UPDATE customtracks SET properties=%s WHERE ID=%s", (properties,trackid) )


    db.commit()
    db.close()


    return returndata