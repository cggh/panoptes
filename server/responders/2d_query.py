from __future__ import print_function
from __future__ import absolute_import
# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
from builtins import zip
from builtins import str
from builtins import map
from builtins import range
import json

import DQXDbTools
from operator import itemgetter
import os
import zarr
import dask.array as da
import numpy as np
import config
import arraybuffer
from .gzipstream import gzip

#curl 'http://localhost:8000/app01?datatype=custom&respmodule=2d_server&respid=2d_query&dataset=Genotypes&col_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&row_qry=eyJ3aGNDbGFzcyI6InRyaXZpYWwiLCJpc0NvbXBvdW5kIjpmYWxzZSwiVHBlIjoiIiwiaXNUcml2aWFsIjp0cnVlfQ==&datatable=genotypes&property=first_allele&col_order=SnpName&row_order=ID' -H 'Pragma: no-cache' -H 'Accept-Encoding: gzip,deflate,sdch' --compressed
from .importer.SettingsDataTable import SettingsDataTable
from .importer.Settings2Dtable import Settings2Dtable
from DQXDbTools import desciptionToDType
from cache import getCache

def index_table_query(dataset, cur, table, fields, query, order, limit, offset, fail_limit, index_field, sample):
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
    if sample is not None:
        sqlquery += ' SAMPLE {0}'.format(sample)

    cache = getCache()
    cacheKey = json.dumps([sqlquery, params])
    rows, description = None, None
    try:
        rows, description = cache[cacheKey]
    except KeyError:
        print('2D', sqlquery, params)
        pass

    if rows is None:
        cur.execute(sqlquery, params)
        rows = cur.fetchall()
        description = cur.description
        #We cache even if random sample is requested such that requests at different points on the col axis pick the same rows and vice-versa - ie we always want the same random sample.
        cache[cacheKey] = [rows, description]

    data = {}
    for i, (field, desc) in enumerate(zip(fields, description)):
        dtype = desciptionToDType(desc[1])
        data[field] = np.array([row[i] for row in rows], dtype=dtype)
    return data


def select_by_list(properties, row_idx, col_idx):
    result = {}
    for prop, array in list(properties.items()):
        dask_task = array[col_idx][:, row_idx]
        result[prop] = dask_task.compute()
    return result

def get_table_ids(cur, dataset, datatable):
    tableSettings = Settings2Dtable()
    tableSettings.loadFile(os.path.join(config.SOURCEDATADIR, 'datasets', dataset, '2D_datatables', datatable, 'settings'))
    return tableSettings['columnDataTable'], tableSettings['rowDataTable']


def response(request_data):
    return request_data


def extract2D(dataset, datatable, row_idx, col_idx, two_d_properties):
    zarr_file = zarr.DirectoryStore(os.path.join(config.BASEDIR, '2D_data', dataset + '_' + datatable + '.zarr'))
    root_group = zarr.open_group(zarr_file)
    two_d_properties = dict((prop, da.from_array(root_group[prop], chunks=root_group[prop].chunks, fancy=False)) for prop in two_d_properties)
    if len(col_idx) == 0 or len(row_idx) == 0:
        two_d_result = {}
        for prop in list(two_d_properties.keys()):
            two_d_result[prop] = np.array([], dtype=two_d_properties[prop].dtype)
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
    return str(call) + ''.join([str(a).zfill(2) for a in calls])

def handler(start_response, request_data):
    datatable = request_data['table']
    dataset = request_data['dataset']

    #Due to caching we check for auth here, as otherwise auth is only checked on DB read.
    DQXDbTools.CredentialInformation(request_data).VerifyCanDo(DQXDbTools.DbOperationRead(dataset))

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
    try:
        row_random_sample = int(request_data['rowRandomSample'])
    except KeyError:
        row_random_sample = None

    col_index_field = datatable + '_column_index'
    row_index_field = datatable + '_row_index'
    col_properties.append(col_index_field)
    row_properties.append(row_index_field)

    cache = getCache()
    cache_key = json.dumps([datatable, dataset, two_d_properties, col_properties, row_properties, col_qry, col_order,
                           row_qry, row_order, row_order_columns, row_random_sample, col_limit, row_limit, col_offset,
                           row_offset, col_fail_limit, row_sort_property, col_key, sort_mode])
    data = None
    try:
        data = cache[cache_key]
    except KeyError:
        print('2D Cache miss')
        pass

    if data is None:
        with DQXDbTools.DBCursor(request_data, dataset, read_timeout=config.TIMEOUT) as cur:
            col_tablename, row_tablename = get_table_ids(cur, dataset, datatable)
            col_result = index_table_query(dataset,
                                           cur,
                                           col_tablename,
                                           col_properties,
                                           col_qry,
                                           col_order,
                                           col_limit,
                                           col_offset,
                                           col_fail_limit,
                                           col_index_field,
                                           None)

            if len(row_order_columns) > 0:
                #If we are sorting by 2d data then we need to grab all the rows as the limit applies post sort.
                row_result = index_table_query(dataset,
                                               cur,
                                               row_tablename,
                                               row_properties,
                                               row_qry,
                                               row_order,
                                               None,
                                               None,
                                               None,
                                               row_index_field,
                                               row_random_sample)

            else:
                row_result = index_table_query(dataset,
                                               cur,
                                               row_tablename,
                                               row_properties,
                                               row_qry,
                                               row_order,
                                               row_limit,
                                               row_offset,
                                               None,
                                               row_index_field,
                                               row_random_sample)

            col_idx = col_result[col_index_field]
            row_idx = row_result[row_index_field]
            del col_result[col_index_field]
            del row_result[row_index_field]
            if len(col_idx) == col_fail_limit:
                result_set = [('_over_col_limit', np.array([0], dtype='i1'))]
                for name, array in list(row_result.items()):
                    result_set.append((('row_'+name), array))
            else:
                if len(row_order_columns) > 0 and len(row_idx) > 0:
                    #Translate primkeys to idx
                    sqlquery = 'SELECT "{col_field}", "{idx_field}" FROM "{table}" WHERE "{col_field}" IN ({params})'.format(
                        idx_field=DQXDbTools.ToSafeIdentifier(col_index_field),
                        table=DQXDbTools.ToSafeIdentifier(col_tablename),
                        params="'"+"','".join(map(DQXDbTools.ToSafeIdentifier, row_order_columns))+"'",
                        col_field=DQXDbTools.ToSafeIdentifier(col_key))
                    idx_for_col = dict((k, v) for k,v in cur.fetchall())
                    #Sort by the order specified - reverse so last clicked is major sort
                    sort_col_idx = list(reversed([idx_for_col[key] for key in row_order_columns]))
                    #grab the data needed to sort
                    sort_data = extract2D(dataset, datatable, row_idx, sort_col_idx, [row_sort_property])
                    rows = list(zip(row_idx, sort_data[row_sort_property]))
                    if sort_mode == 'call':
                        polyploid_key_func = lambda row: ''.join(summarise_call(calls) for calls in row[1])
                        haploid_key_func = lambda row: ''.join([str(c).zfill(2) for c in row[1]])
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
                        print("Unimplemented sort_mode")
                    row_pos_for_idx = dict(list(zip(row_idx, list(range(len(row_idx))))))
                    #Now just get the row_idx to pass to 2d extract for the slice we need
                    row_idx = np.array(map(itemgetter(0), rows)[row_offset: row_offset+row_limit])
                    #Use this row idx to retieve the row data from the initial query
                    for name, array in list(row_result.items()):
                        row_result[name] = array[[row_pos_for_idx[idx] for idx in row_idx]]

                two_d_result = extract2D(dataset, datatable, row_idx, col_idx, two_d_properties)

                result_set = []
                for name, array in list(col_result.items()):
                    result_set.append((('col_'+name), array))
                for name, array in list(row_result.items()):
                    result_set.append((('row_'+name), array))
                for name, array in list(two_d_result.items()):
                    result_set.append((('2D_'+name), array))
        data = gzip(data=b''.join(arraybuffer.encode_array_set(result_set)))
        cache[cache_key] = data
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip'),
                        ('Access-Control-Allow-Origin', '*')
                        ]
    start_response(status, response_headers)
    yield data



