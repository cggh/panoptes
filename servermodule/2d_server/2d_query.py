import DQXDbTools
from file_dict import FileDict
from struct import pack
import StringIO
from gzip import GzipFile
from itertools import islice, takewhile
from operator import ne
from functools import partial
import hashlib
import h5py
import numpy as np
import config
import arraybuffer

#TODO cache doesn't have locking....
cache = FileDict('cache')

callset_fn = config.HDF5_FILE
callset = h5py.File(callset_fn, 'r')
allele_depth = callset['calldata_2d']['AD']

import collections
import functools

def gzip(data):
    out = StringIO.StringIO()
    f = GzipFile(fileobj=out, mode='w')
    f.write(data)
    f.close()
    return out.getvalue()

def index_from_query(database, table, query, order=None):
    db = DQXDbTools.OpenDatabase(database)
    cur = db.cursor()

    whc=DQXDbTools.WhereClause()
    whc.ParameterPlaceHolder='%s'#NOTE!: MySQL PyODDBC seems to require this nonstardard coding
    whc.Decode(query)
    whc.CreateSelectStatement()

    sqlquery = "SELECT "
    sqlquery += "idx FROM {0}".format(table)
    if len(whc.querystring_params)>0:
        sqlquery += " WHERE {0}".format(whc.querystring_params)
    if order:
        sqlquery += " ORDER BY {0}".format(order)
    print('################################################')
    print('###QRY:'+sqlquery)
    print('###PARAMS:'+str(whc.queryparams))
    print('################################################')
    cur.execute(sqlquery,whc.queryparams)
    for row in cur.fetchall():
        yield row[0]
    cur.close()
    db.close()

def select_by_list(dataset, selection):
    #TODO Selecting ~200 at a time is about 4x faster....
    sel = h5py._hl.selections.PointSelection(dataset.shape)
    sel.set(selection)
    out = np.ndarray(sel.mshape, dataset.id.dtype)
    dataset.id.read(h5py.h5s.create_simple(sel.mshape),
                      sel._id,
                      out,
                      h5py.h5t.py_create(dataset.id.dtype))
    return out
        

def response(request_data):
    return request_data

def split(n, gen):
    remaining = True
    gen = iter(gen)
    while remaining:
        out = []
        for x in xrange(n):
            try:
                out.append(gen.next())
            except StopIteration:
                remaining = False
                break
        if len(out) > 0:
            yield out

def read_count_stream(coord_groups):
    for group in coord_groups:
        depth = select_by_list(allele_depth, group)
        for a, r in depth:
            yield a
            yield r

def cartesian(arrays, out=None):
    """
    Generate a cartesian product of input arrays.

    Parameters
    ----------
    arrays : list of array-like
        1-D arrays to form the cartesian product of.
    out : ndarray
        Array to place the cartesian product in.

    Returns
    -------
    out : ndarray
        2-D array of shape (M, len(arrays)) containing cartesian products
        formed of input arrays.

    Examples
    --------
    >>> cartesian(([1, 2, 3], [4, 5], [6, 7]))
    array([[1, 4, 6],
           [1, 4, 7],
           [1, 5, 6],
           [1, 5, 7],
           [2, 4, 6],
           [2, 4, 7],
           [2, 5, 6],
           [2, 5, 7],
           [3, 4, 6],
           [3, 4, 7],
           [3, 5, 6],
           [3, 5, 7]])

    """

    arrays = [np.asarray(x) for x in arrays]
    dtype = arrays[0].dtype

    n = np.prod([x.size for x in arrays])
    if out is None:
        out = np.zeros([n, len(arrays)], dtype=dtype)

    m = n / arrays[0].size
    out[:,0] = np.repeat(arrays[0], m)
    if arrays[1:]:
        cartesian(arrays[1:], out=out[0:m,1:])
        for j in xrange(1, arrays[0].size):
            out[j*m:(j+1)*m,1:] = out[0:m,1:]
    return out

def handler(start_response, request_data):
    key = hashlib.sha224((request_data['database'] + 
                          request_data['var_tbname'] +
                          request_data['var_qry'] + 
                          request_data['samp_tbname'] +
                          request_data['samp_qry'] + 
                          '_2d')).hexdigest()
    try:
        data = cache[key]
    except KeyError:
        var_idx = index_from_query(request_data['database'], 
        	                           request_data['var_tbname'],
                                       request_data['var_qry'],
                                       'pos')

        samp_idx = index_from_query(request_data['database'],
        	                           request_data['samp_tbname'],
                                       request_data['samp_qry'],
                                       'ox_code')

        #SQL interface can't cope with con-current queries....
        samp_idx = list(samp_idx)
        var_idx = list(var_idx)
        coords = cartesian((var_idx, samp_idx))
        genotypes = select_by_list(allele_depth, coords)
        data = gzip(''.join(arraybuffer.encode_array(genotypes)))
        cache[key] = data
    status = '200 OK'
    response_headers = [('Content-type', 'text/plain'),
                        ('Content-Length', str(len(data))),
                        ('Content-Encoding', 'gzip')]
    start_response(status, response_headers)
    yield data



