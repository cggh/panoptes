import DQXDbTools
import uuid
import os
import config
import VTTable


def response(returndata):

    databaseName = returndata['database']
    trackid = returndata['trackid']

    print('deleting track '+trackid)

    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()

    cur.execute("DROP TABLE "+trackid)
    cur.execute("DELETE FROM customtracks WHERE id=%s", (trackid) )


    db.commit()
    db.close()


    return returndata