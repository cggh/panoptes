import DQXDbTools


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    id = DQXDbTools.ToSafeIdentifier(returndata['id'])

    #Obtain the settings from storeddata
    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    db = DQXDbTools.OpenDatabase(credInfo)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()
    sqlstring = 'SELECT content FROM storage WHERE id="{0}"'.format(id)
    cur.execute(sqlstring)
    therow = cur.fetchone()
    settings = therow[0]
    #todo: remove that record

    sql = 'INSERT INTO storedviews VALUES ("{0}", "{1}", "{2}", "{3}")'.format(databaseName, workspaceid, id, settings)
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata