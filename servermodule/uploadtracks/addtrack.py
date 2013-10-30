import DQXDbTools
import uuid
import os
import config
import VTTable

def GenerateError(returndata, msg):
    returndata['Error'] = msg
    return returndata


def response(returndata):

    databaseName = returndata['database']

    trackUid = 'TR'+str(uuid.uuid1()).replace('-', '_')
    workspaceid = DQXDbTools.ToSafeIdentifier(returndata['workspaceid'])
    trackName = DQXDbTools.ToSafeIdentifier(returndata['name'])
    colnr=2

    file_path = os.path.join(config.BASEDIR, 'Uploads', returndata['fileid'])
    tb = VTTable.VTTable()
    tb.allColumnsText = True
    try:
        tb.LoadFile(file_path)
    except Exception as e:
        return GenerateError(returndata, 'Invalid data file format')

    if tb.IsColumnPresent('Chr'):
        tb.RenameCol('Chr','chrom')
    if tb.IsColumnPresent('Pos'):
        tb.RenameCol('Pos','pos')

    if not(tb.IsColumnPresent('chrom')):
        return GenerateError(returndata, 'Column "chrom" is not present')
    if not(tb.IsColumnPresent('pos')):
        return GenerateError(returndata, 'Column "pos" is not present')
#    if not(tb.IsColumnPresent('value')):
#        return GenerateError(returndata, 'Column "value" is not present')

    tb.ConvertColToValue('pos')
    tb.RenameCol(tb.GetColName(colnr),trackUid)
    tb.ConvertColToValue(trackUid)

    sqlfile = os.path.join(config.BASEDIR, 'Uploads', 'tb_'+returndata['fileid']+'.sql')
    tb.SaveSQLDump(sqlfile, trackUid)


    db = DQXDbTools.OpenDatabase(databaseName)
    cur = db.cursor()
    cur.execute("INSERT INTO customtracks VALUES (%s,%s,'',%s)", (trackUid, trackName,workspaceid) )

    sql = "CREATE TABLE {0} (chrom varchar(20), pos int, {1} float)".format(trackUid,trackUid)
    print(sql)
    cur.execute(sql)

    sql = "CREATE INDEX chrom ON {0}(chrom)".format(trackUid)
    print(sql)
    cur.execute(sql)

    sql = "CREATE INDEX pos ON {0}(pos)".format(trackUid)
    print(sql)
    cur.execute(sql)

    db.commit()
    db.close()

    cmd = config.mysqlcommand + " -u {0} -p{1} {2} < {3}".format(config.DBUSER, config.DBPASS, databaseName, sqlfile)
    print(cmd)
    os.system(cmd)


    returndata['trackid'] = trackUid
    return returndata

