# This file is part of DQXServer - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import B64
import DQXDbTools
import DQXUtils
import config
from DQXDbTools import DBCOLESC
from DQXDbTools import DBTBESC

#Return annotation information for a chromosome region
def response(returndata):

    databaseName=None
    if 'database' in returndata:
        databaseName = DQXDbTools.ToSafeIdentifier(returndata['database'])

    field_chrom = 'chromid'
    if 'fieldchrom' in returndata:
        field_chrom = DQXDbTools.ToSafeIdentifier(returndata['fieldchrom'])
    field_start = 'fstart'
    if 'fieldstart' in returndata:
        field_start = DQXDbTools.ToSafeIdentifier(returndata['fieldstart'])
    field_stop = 'fstop'
    if 'fieldstop' in returndata:
        field_stop = DQXDbTools.ToSafeIdentifier(returndata['fieldstop'])
    field_id = 'fid'
    if 'fieldid' in returndata:
        field_id = DQXDbTools.ToSafeIdentifier(returndata['fieldid'])
    field_name = 'fname'
    if 'fieldname' in returndata:
        field_name = DQXDbTools.ToSafeIdentifier(returndata['fieldname'])
    extrafield1 = None
    hasExtraField1 = False
    if 'extrafield1' in returndata:
        hasExtraField1 = True
        extrafield1 = DQXDbTools.ToSafeIdentifier(returndata['extrafield1'])

    hasFeatureType = ('ftype' in returndata) and (len(returndata['ftype']) > 0)
    hasSubFeatures = (returndata['subfeatures']=='1') and ('fsubtype' in returndata)


    with DQXDbTools.DBCursor(returndata, databaseName, read_timeout=config.TIMEOUT) as cur:
        tablename=DQXDbTools.ToSafeIdentifier(returndata['table'])

        typequerystring='(true)'
        queryparams = []
        if hasFeatureType:
            typequerystring = ' OR '.join(["(ftype='{0}')".format(item) for item in returndata['ftype'].split(',')])
        if hasSubFeatures:
            typequerystring += " or (ftype='{1}')".format(returndata['ftype'], returndata['fsubtype'])

        if 'qry' in returndata:
            encodedquery = returndata['qry']
            whc=DQXDbTools.WhereClause()
            whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
            whc.Decode(encodedquery)
            whc.CreateSelectStatement()
            if len(whc.querystring_params) > 0:
                typequerystring = whc.querystring_params
                queryparams = whc.queryparams


        statement = 'SELECT {field_start}, {field_stop}, {field_name}, {field_id},'.format(
            field_start=field_start,
            field_stop=field_stop,
            field_name=field_name,
            field_id=field_id
        )

        if hasFeatureType:
            statement +=' ftype, fparentid'
        else:
            statement +=" '_' as ftype, '_' as fparentid"

        if hasExtraField1:
            statement +=', ' + extrafield1


        statement += " FROM \"{tablename}\" WHERE ({typequery}) and ({field_chrom}='{chromid}') and ({field_stop}>={" \
                     "start}) and ({field_start}<={stop}) ORDER BY {field_start}".format(
            typequery=typequerystring,
            tablename=tablename,
            chromid=DQXDbTools.ToSafeIdentifier(returndata['chrom']),
            start=str(int(returndata['start'])),
            stop=str(int(returndata['stop'])),
            field_chrom=field_chrom,
            field_start=field_start,
            field_stop=field_stop
        )

        # print('==============ANNOT====== ')
        # print(str(returndata))
        # print(statement)
        # print('========================= ')

        # DQXUtils.LogServer(statement+'\n')

        cur.execute(statement, queryparams)
        starts = []
        stops = []
        names = []
        ids = []
        types = []
        parentids = []
        extrafield1 = []
        for row in cur.fetchall():
            starts.append(float(row[0]))
            stops.append(float(row[1]))
            name=row[2]
            id=row[3]
            tpe=row[4]
            parentid=row[5]
            names.append(name)
            ids.append(id)
            types.append(tpe)
            parentids.append(parentid)
            if hasExtraField1:
                extrafield1.append(row[6])

        returndata['DataType']='Points'
        valcoder=B64.ValueListCoder()
        returndata['Starts'] = valcoder.EncodeIntegersByDifferenceB64(starts)
        returndata['Sizes'] = valcoder.EncodeIntegers([x[1]-x[0] for x in zip(starts,stops)])
        returndata['Names'] = valcoder.EncodeStrings(names)
        returndata['IDs'] = valcoder.EncodeStrings(ids)
        returndata['Types'] = valcoder.EncodeStrings(types)
        returndata['ParentIDs'] = valcoder.EncodeStrings(parentids)
        if hasExtraField1:
            returndata['ExtraField1'] = valcoder.EncodeStrings(extrafield1)
        return returndata
