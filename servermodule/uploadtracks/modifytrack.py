import DQXDbTools
import uuid
import os
import config
import VTTable


def response(returndata):

    databaseName = returndata['database']
    trackid = returndata['trackid']
    name = returndata['name']
    properties = returndata['properties']

    print('modifying track '+trackid)

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    cur.execute("UPDATE customtracks SET name=%s WHERE ID=%s", (name,trackid) )
    cur.execute("UPDATE customtracks SET properties=%s WHERE ID=%s", (properties,trackid) )


    db.commit()
    db.close()


    return returndata