import DQXDbTools


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    #Obtain the settings from storeddata
    db = DQXDbTools.OpenDatabase()
    cur = db.cursor()
    sqlstring = 'SELECT content FROM storage WHERE id="{0}"'.format(id)
    cur.execute(sqlstring)
    therow = cur.fetchone()
    settings = therow[0]
    #todo: remove that record
    db.close()


    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    sql = 'INSERT INTO storedviews VALUES ("{0}", "{1}", "{2}")'.format(workspaceid, id, settings)
    print('=========== STATEMENT '+sql)
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata