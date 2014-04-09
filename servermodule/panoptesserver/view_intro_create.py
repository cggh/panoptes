import DQXDbTools
import authorization


def response(returndata):

    databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    name ='No name'
    if 'name' in returndata:
        name = returndata['name']
    section = ''
    if 'section' in returndata:
        section = returndata['section']
    description = ''
    if 'description' in returndata:
        description = returndata['description']
    url = returndata['url']
    storeid = DQXDbTools.ToSafeIdentifier(returndata['storeid'])
    viewstate = DQXDbTools.ToSafeIdentifier(returndata['viewstate'])

    #Obtain the settings from storeddata
    credInfo = DQXDbTools.ParseCredentialInfo(returndata)
    authorization.VerifyIsDataSetManager(credInfo, databaseName)

    db = DQXDbTools.OpenDatabase(credInfo, databaseName)
    credInfo.VerifyCanDo(DQXDbTools.DbOperationWrite(None, 'storedviews'))
    cur = db.cursor()

    sqlstring = 'SELECT max(ordr) FROM introviews WHERE workspaceid="{0}"'.format(workspaceid)
    cur.execute(sqlstring)
    rank = 0
    dbrank = cur.fetchone()[0]
    if dbrank is not None:
        rank = dbrank+1


    sql = 'INSERT INTO introviews VALUES (0, "{workspace}", "{name}", "{section}", "{description}", {rank}, "{url}", "{id}", "{state}")'.format(
        workspace=workspaceid,
        name=name,
        section=section,
        description=description,
        rank=rank,
        url=url,
        id=storeid,
        state=viewstate
    )
    cur.execute(sql)
    db.commit()
    db.close()

    return returndata