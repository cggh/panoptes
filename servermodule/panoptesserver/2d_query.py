# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import DQXDbTools
import os
import MySQLdb
import h5py
import itertools
import numpy as np
import config
import arraybuffer
from gzipstream import gzip

#curl 'http://localhost:8000/app01?datatype=custom&respmodule=2d_server&respid=2d_query&dataset=Genotypes&col_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&row_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&datatable=genotypes&property=first_allele&col_order=SnpName&row_order=ID' -H 'Pragma: no-cache' -H 'Accept-Encoding: gzip,deflate,sdch' --compressed

CHUNK_SIZE = 400


def desc_to_dtype(desc):
    col_type = desc[1]
    if col_type in MySQLdb.STRING:
        #Returning none lets numpy figure it out
        return None
    dtype = {
        MySQLdb.FIELD_TYPE.BIT: '?',
        MySQLdb.FIELD_TYPE.SHORT: 'i1',
        MySQLdb.FIELD_TYPE.CHAR: 'u1',
        MySQLdb.FIELD_TYPE.LONG: 'i4',
        MySQLdb.FIELD_TYPE.LONGLONG: 'i8',
        MySQLdb.FIELD_TYPE.TINY: 'i1',
        MySQLdb.FIELD_TYPE.DOUBLE: 'f8',
        MySQLdb.FIELD_TYPE.FLOAT: 'f4'
    }
    return dtype[col_type]


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
        query = "WHERE " + DQXDbTools.ToSafeIdentifier(index_field) + ' IS NOT NULL'
    fields_string = ','.join('`'+DQXDbTools.ToSafeIdentifier(f)+'`' for f in fields)
    table = DQXDbTools.ToSafeIdentifier(table)
    order = DQXDbTools.ToSafeIdentifier(order)
    sqlquery = "SELECT {fields_string} FROM {table} {query} ORDER BY {order}".format(**locals())
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
        dtype = desc_to_dtype(desc)
        result[field] = np.array([row[i] for row in rows], dtype=dtype)
    return result


def select_by_list(properties, row_idx, col_idx, first_dimension):
    num_cells = len(col_idx) * len(row_idx)
    if first_dimension == 'row':
        coords = ((row, col) for row in row_idx for col in col_idx)
    elif first_dimension == 'column':
        coords = ((col, row) for row in row_idx for col in col_idx)
    else:
        print "Bad first_dimension"
    result = {}
    for prop, array in properties.items():
        result[prop] = np.empty((num_cells,), dtype=array.id.dtype)
    num_chunks = num_cells / CHUNK_SIZE
    num_chunks = num_chunks + 1 if num_cells % CHUNK_SIZE else num_chunks
    for i in xrange(num_chunks):
        selection = np.asarray(list(itertools.islice(coords, CHUNK_SIZE)))
        for prop, array in properties.items():
            sel = h5py._hl.selections.PointSelection(array.shape)
            sel.set(selection)
            out = np.ndarray(sel.mshape, array.id.dtype)
            array.id.read(h5py.h5s.create_simple(sel.mshape),
                          sel._id,
                          out,
                          h5py.h5t.py_create(array.id.dtype))
            result[prop][i * CHUNK_SIZE: (i * CHUNK_SIZE) + len(selection)] = out[:]
    for prop, array in result.items():
        array.shape = (len(row_idx), len(col_idx))
    return result


def get_table_ids(cur, datatable):
    sql = "SELECT col_table, row_table FROM 2D_tablecatalog WHERE id=%s"
    cur.execute(sql, (datatable,))
    result = cur.fetchall()[0]
    return result


def get_workspace_table_name(tableid, workspaceid):
    return "{0}CMB_{1}".format(tableid, workspaceid)


def response(request_data):
    return request_data


def extract2D(dataset, datatable, row_idx, col_idx, first_dimension, two_d_properties):
    hdf5_file = h5py.File(os.path.join(config.BASEDIR, '2D_data', dataset + '_' + datatable + '.hdf5'), 'r')
    two_d_properties = dict((prop, None) for prop in two_d_properties)
    for prop in two_d_properties.keys():
        two_d_properties[prop] = hdf5_file[prop]
    if len(col_idx) == 0 or len(row_idx) == 0:
        two_d_result = {}
        for prop in two_d_properties.keys():
            two_d_result[prop] = np.array([], dtype=two_d_properties[prop].id.dtype)
    else:
        two_d_result = select_by_list(two_d_properties, row_idx, col_idx, first_dimension)
    return two_d_result


def handler(start_response, request_data):
    datatable = request_data['datatable']
    dataset = request_data['dataset']
    workspace = request_data['workspace']
    two_d_properties = request_data['2D_properties'].split('~')
    col_properties = request_data['col_properties'].split('~')
    row_properties = request_data['row_properties'].split('~')
    col_qry = request_data['col_qry']
    col_order = request_data['col_order']
    row_qry = request_data['row_qry']
    row_order = request_data['row_order']
    first_dimension = request_data['first_dimension']
    try:
        col_limit = int(request_data['col_limit'])
    except KeyError:
        col_limit = None
    try:
        row_limit = int(request_data['row_limit'])
    except KeyError:
        row_limit = None
    try:
        col_offset = int(request_data['col_offset'])
    except KeyError:
        col_offset = None
    try:
        row_offset = int(request_data['row_offset'])
    except KeyError:
        row_offset = None
    #Set fail limit to one past so we know if we hit it
    try:
        col_fail_limit = int(request_data['col_fail_limit'])+1
    except KeyError:
        col_fail_limit = None
    try:
        row_fail_limit = int(request_data['row_fail_limit'])+1
    except KeyError:
        row_fail_limit = None

    with DQXDbTools.DBCursor(request_data, dataset, read_timeout=config.TIMEOUT) as cur:
        col_tableid, row_tableid = get_table_ids(cur, datatable)

        col_tablename = get_workspace_table_name(col_tableid, workspace)
        row_tablename = get_workspace_table_name(row_tableid, workspace)

        col_index_field = datatable + '_column_index'
        row_index_field = datatable + '_row_index'
        col_properties.append(col_index_field)
        row_properties.append(row_index_field)

        col_result = index_table_query(cur,
                                       col_tablename,
                                       col_properties,
                                       col_qry,
                                       col_order,
                                       col_limit,
                                       col_offset,
                                       col_fail_limit,
                                       col_index_field)

        row_result = index_table_query(cur,
                                       row_tablename,
                                       row_properties,
                                       row_qry,
                                       row_order,
                                       row_limit,
                                       row_offset,
                                       row_fail_limit,
                                       row_index_field)

    col_idx = col_result[col_index_field]
    row_idx = row_result[row_index_field]
    if len(col_idx) == col_fail_limit:
        result_set = [('_over_col_limit', np.array([0], dtype='i1'))]
    else:
        del col_result[col_index_field]
        del row_result[row_index_field]

        two_d_result = extract2D(dataset, datatable, row_idx, col_idx, first_dimension, two_d_properties)

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
                        ('Content-Encoding', 'gzip')]
    start_response(status, response_headers)
    yield data



