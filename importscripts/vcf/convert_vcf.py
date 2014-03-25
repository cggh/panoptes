import collections
import os
import vcfnp
import errno
from compiler.ast import flatten
import numpy


def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as exc: # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else: raise

vcf_file = "ag1000g.phase1.AR1.Y_unplaced.PASS.vcf.gz"
variants = vcfnp.variants(vcf_file)


def names_from_dtype(dtype, path=''):
    if dtype.names:
        #dtypes don't support iter.... yes. I know.
        dtype_as_list = [dtype[i] for i in xrange(len(dtype))]
        return [names_from_dtype(inner_dtype, path+'.'+name if path else name)
                for name, inner_dtype in zip(dtype.names, dtype_as_list)]
    elif dtype.kind == 'V': #a vector with no names! We will have to just number them...
        return [path+'.'+str(i) if path else str(i) for i in range(dtype.shape[0])]
    else:
        return path

def flatten_numpy_line(line):
    for entry in line:
        if type(entry) == numpy.void:
            flatten_numpy_line(entry)
        else:
            yield entry


mkdir_p('panoptes_ready_vcf_data/datatables/variants')
out_file = 'panoptes_ready_vcf_data/datatables/variants/data'
with open(out_file, 'w') as f:
    f.write('\t'.join(flatten(names_from_dtype(variants.dtype))))
    f.write('\n')
    for line in variants:
        print line
        print list(flatten_numpy_line(line))
        f.write('\t'.join(map(str, flatten_numpy_line(line))))
        f.write('\n')





