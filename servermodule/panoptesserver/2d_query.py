# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
from operator import itemgetter
import os
import h5py
import itertools
import numpy as np
import config
import arraybuffer
from gzipstream import gzip

#curl 'http://localhost:8000/app01?datatype=custom&respmodule=2d_server&respid=2d_query&dataset=Genotypes&col_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&row_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&datatable=genotypes&property=first_allele&col_order=SnpName&row_order=ID' -H 'Pragma: no-cache' -H 'Accept-Encoding: gzip,deflate,sdch' --compressed
from importer.SettingsDataTable import SettingsDataTable
from importer.Settings2Dtable import Settings2Dtable
from DQXDbTools import desciptionToDType
CHUNK_SIZE = 400



def index_table_query(cur, table, fields, query, order, limit, offset, fail_limit, index_field):
    if limit and fail_limit:
        raise Exception("Only one type of limit can be specified")
    where = DQXDbTools.WhereClause()
    where.ParameterPlaceHolder = '%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    where.Decode(query)
    where.CreateSelectStatement()
    if index_field not in fields:
        fields.append(index_field)
    if len(where.querystring_params) > 0:
        query = "WHERE " + where.querystring_params + ' AND ' + DQXDbTools.ToSafeIdentifier(index_field) + ' IS NOT NULL'
    else:
        query = "WHERE " + DQXDbTools.DBCOLESC(index_field) + ' IS NOT NULL'
    fields_string = ','.join('"'+DQXDbTools.ToSafeIdentifier(f)+'"' for f in fields)
    table = DQXDbTools.ToSafeIdentifier(table)
    sqlquery = 'SELECT {fields_string} FROM "{table}" {query}'.format(**locals())
    if order:
         sqlquery += ' ORDER BY "{0}"'.format(DQXDbTools.ToSafeIdentifier(order))
    params = where.queryparams
    #Set the limit to one past the req
    limit = limit or fail_limit
    if limit:
        sqlquery += ' LIMIT %s'
        params.append(int(limit))
    if offset:
        sqlquery += ' OFFSET %s'
        params.append(int(offset))
    
    print sqlquery, params
    cur.execute(sqlquery, params)
    rows = cur.fetchall()
    result = {}
    for i, (field, desc) in enumerate(zip(fields, cur.description)):
        dtype = desciptionToDType(desc)
        result[field] = np.array([row[i] for row in rows], dtype=dtype)
    return result


def select_by_list(properties, row_idx, col_idx):
    num_cells = len(col_idx) * len(row_idx)
    arities = {}
    for prop, array in properties.items():
        if len(array.shape) == 2:
            arities[prop] = 1
        else:
            arities[prop] = array.shape[2]
    coords = {}
    for arity in arities.values():
        if arity == 1:
            coords[arity] = [(col, row) for row in row_idx for col in col_idx]
        else:
            coords[arity] = [(col, row, i) for row in row_idx for col in col_idx for i in xrange(arity)]

    result = {}
    for prop, array in properties.items():
        arity = arities[prop]
        result[prop] = np.empty((num_cells * arity,), dtype=array.id.dtype)
        num_chunks = num_cells*arity / CHUNK_SIZE
        num_chunks = num_chunks + 1 if (num_cells*arity) % CHUNK_SIZE else num_chunks
        i_coords = iter(coords[arity])
        for i in xrange(num_chunks):
            slice = list(itertools.islice(i_coords, CHUNK_SIZE))
            selection = np.asarray(slice)
            sel = h5py._hl.selections.PointSelection(array.shape)
            sel.set(selection)
            out = np.ndarray(sel.mshape, array.id.dtype)
            array.id.read(h5py.h5s.create_simple(sel.mshape),
                          sel._id,
                          out,
                          h5py.h5t.py_create(array.id.dtype))
            result[prop][i * CHUNK_SIZE: (i * CHUNK_SIZE) + len(selection)] = out[:]
        result[prop].shape = (len(row_idx), len(col_idx)) if arities[prop] == 1 else (len(row_idx), len(col_idx), arity)
    return result

def get_table_ids(cur, dataset, datatable):
    tableSettings = Settings2Dtable()
    tableSettings.loadFile(os.path.join(config.SOURCEDATADIR, 'datasets', dataset, '2D_datatables', datatable, 'settings'))

    return tableSettings['columnDataTable'], tableSettings['rowDataTable']


def response(request_data):
    return request_data


def extract2D(dataset, datatable, row_idx, col_idx, two_d_properties):
    hdf5_file = h5py.File(os.path.join(config.BASEDIR, '2D_data', dataset + '_' + datatable + '.hdf5'), 'r')
    two_d_properties = dict((prop, None) for prop in two_d_properties)
    for prop in two_d_properties.keys():
        two_d_properties[prop] = hdf5_file[prop]
    if len(col_idx) == 0 or len(row_idx) == 0:
        two_d_result = {}
        for prop in two_d_properties.keys():
            two_d_result[prop] = np.array([], dtype=two_d_properties[prop].id.dtype)
    else:
        two_d_result = select_by_list(two_d_properties, row_idx, col_idx)
    return two_d_result

def summarise_call(calls):
    call = -2
    for oc in calls:
        c = 2 if oc > 0 else oc #ALT
        if c == -1: #Missing
            call = -1
            break
        if c == 0 and call == 2: #REF BUT WAS PREVIOUSLY ALT
            call = 1 #HET
            break
        if c == 2 and call == 0: #ALT BUT WAS PREVIOUSLY REF
            call = 1 #HET
            break
        call = c
    return str(call) + ''.join(map(lambda a: str(a).zfill(2), calls))

def handler(start_response, request_data):
    datatable = request_data['table']
    dataset = request_data['dataset']
    two_d_properties = request_data['2DProperties'].split('~')
    col_properties = request_data['colProperties'].split('~')
    row_properties = request_data['rowProperties'].split('~')
    col_qry = request_data['colQry']
    col_order = request_data['colOrder']
    row_qry = request_data['rowQry']
    row_order = request_data.get('rowOrder', None)
    row_order_columns = []
    if row_order == 'columns':
        try:
            row_order_columns = request_data['rowSortCols'].split('~')
        except KeyError:
            pass
        row_order = None
    try:
        col_limit = int(request_data['colLimit'])
    except KeyError:
        col_limit = None
    try:
        row_limit = int(request_data['rowLimit'])
    except KeyError:
        row_limit = None
    try:
        col_offset = int(request_data['colOffset'])
    except KeyError:
        col_offset = None
    try:
        row_offset = int(request_data['rowOffset'])
    except KeyError:
        row_offset = None
    #Set fail limit to one past so we know if we hit it
    try:
        col_fail_limit = int(request_data['colFailLimit'])+1
    except KeyError:
        col_fail_limit = None
    try:
        row_sort_property = request_data['rowSortProperty']
    except KeyError:
        row_sort_property = None
    try:
        col_key = request_data['colKey']
    except KeyError:
        col_key = None
    try:
        sort_mode = request_data['sortMode']
    except KeyError:
        sort_mode = None



    col_index_field = datatable + '_column_index'
    row_index_field = datatable + '_row_index'
    col_properties.append(col_index_field)
    row_properties.append(row_index_field)

    with DQXDbTools.DBCursor(request_data, dataset, read_timeout=config.TIMEOUT) as cur:
        col_tablename, row_tablename = get_table_ids(cur, dataset, datatable)

        col_result = index_table_query(cur,
                                       col_tablename,
                                       col_properties,
                                       col_qry,
                                       col_order,
                                       col_limit,
                                       col_offset,
                                       col_fail_limit,
                                       col_index_field)

        if len(row_order_columns) > 0:
            #If we are sorting by 2d data then we need to grab all the rows as the limit applies post sort.
            row_result = index_table_query(cur,
                                           row_tablename,
                                           row_properties,
                                           row_qry,
                                           row_order,
                                           None,
                                           None,
                                           None,
                                           row_index_field)

        else:
            row_result = index_table_query(cur,
                                           row_tablename,
                                           row_properties,
                                           row_qry,
                                           row_order,
                                           row_limit,
                                           row_offset,
                                           None,
                                           row_index_field)

        col_idx = col_result[col_index_field]
        row_idx = row_result[row_index_field]
        del col_result[col_index_field]
        del row_result[row_index_field]
        if len(col_idx) == col_fail_limit:
            result_set = [('_over_col_limit', np.array([0], dtype='i1'))]
            for name, array in row_result.items():
                result_set.append((('row_'+name), array))
        else:
            if len(row_order_columns) > 0 and len(row_idx) > 0:
                #Translate primkeys to idx
                sqlquery = 'SELECT "{col_field}", "{idx_field}" FROM "{table}" WHERE "{col_field}" IN ({params})'.format(
                    idx_field=DQXDbTools.ToSafeIdentifier(col_index_field),
                    table=DQXDbTools.ToSafeIdentifier(col_tablename),
                    params="'"+"','".join(map(DQXDbTools.ToSafeIdentifier, row_order_columns))+"'",
                    col_field=DQXDbTools.ToSafeIdentifier(col_key))
                print sqlquery
                cur.execute(sqlquery)
                idx_for_col = dict((k, v) for k,v in cur.fetchall())
                #Sort by the order specified - reverse so last clicked is major sort
                sort_col_idx = list(reversed(map(lambda key: idx_for_col[key], row_order_columns)))
                #grab the data needed to sort
                sort_data = extract2D(dataset, datatable, row_idx, sort_col_idx, [row_sort_property])
                rows = zip(row_idx, sort_data[row_sort_property])
                if sort_mode == 'call':
                    polyploid_key_func = lambda row: ''.join(summarise_call(calls) for calls in row[1])
                    haploid_key_func = lambda row: ''.join(map(lambda c: str(c).zfill(2), row[1]))
                    if len(rows[0][1].shape) == 1:
                        rows.sort(key=haploid_key_func, reverse=True)
                    else:
                        rows.sort(key=polyploid_key_func, reverse=True)
                elif sort_mode == 'fraction':
                    for i in range(len(sort_col_idx)):
                        #TODO Shuld be some fancy bayesian shizzle
                        def key_func(row):
                            if sum(row[1][i]) == 0:
                                return '-1'
                            return str(1-float(row[1][i][0])/sum(row[1][i]))+str(sum(row[1][i])).zfill(4)
                        rows.sort(key=key_func, reverse=True)
                else:
                    print "Unimplemented sort_mode"
                row_pos_for_idx = dict(zip(row_idx, range(len(row_idx))))
                #Now just get the row_idx to pass to 2d extract for the slice we need
                row_idx = np.array(map(itemgetter(0), rows)[row_offset: row_offset+row_limit])
                #Use this row idx to retieve the row data from the initial query
                for name, array in row_result.items():
                    row_result[name] = array[[row_pos_for_idx[idx] for idx in row_idx]]

            two_d_result = extract2D(dataset, datatable, row_idx, col_idx, two_d_properties)

            result_set = []
            for name, array in col_result.items():
                result_set.append((('col_'+name), array))
            for name, array in row_result.items():
                result_set.append((('row_'+name), array))
            for name, array in two_d_result.items():
                result_set.append((('2D_'+name), array))
    data = gzip(data=''.join(arraybuffer.encode_array_set(result_set)))
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip'),
                        ('Access-Control-Allow-Origin', '*')
                        ]
    start_response(status, response_headers)
    yield data



