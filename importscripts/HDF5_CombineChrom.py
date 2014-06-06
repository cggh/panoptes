# This file is part of Panoptes - (C) Copyright 2014, Paul Vauterin, Ben Jeffery, Alistair Miles <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>

import h5py
import sys
import progressbar as pb

#szip:
# wget http://www.hdfgroup.org/ftp/lib-external/szip/2.1/src/szip-2.1.tar.gz
#tar xzvf szip-2.1.tar.gz
#cd szip-2.1
#./configure  --prefix=/usr/local
#make install
#ldconfig
#wget http://www.hdfgroup.org/ftp/HDF5/current/src/hdf5-1.8.12.tar.bz2
#tar jxvf hdf5-1.8.12.tar.bz2
#cd hdf5-1.8.12
#./configure  --prefix=/usr/local --with-szlib
#make
#make install
#ldconfig

widgets = ['Something:', ' ', pb.Percentage(), ' ', pb.Counter(), ' ', pb.Bar(marker=pb.RotatingMarker()),
           ' ', pb.ETA(), ' ', pb.FileTransferSpeed()]

infile = h5py.File(sys.argv[1],'r')
outfile = h5py.File(sys.argv[2],'w', libver='latest')

#Copy metadata
for key in infile.attrs.keys():
    outfile.attrs[key] = infile.attrs[key]

chroms = sorted(infile.keys())
#Find total length
num_vars = sum(len(infile[chrom]['POS']) for chrom in chroms)
print num_vars, ' variants'

#Copy each dataset, then resize and insert the data from other chroms, assumes variant to be first dimension
def copy(object_name):
    obj = infile[chroms[0]][object_name]
    if type(obj) == h5py.Group:
        outfile.create_group(object_name)
    else:
        #Dataset - create simlar copy but with room for all chroms
        shape = list(obj.shape)
        shape[0] = num_vars
        print object_name, obj, shape, obj.dtype
        try:
            dset = outfile.create_dataset(object_name, shape, obj.dtype,
                                          maxshape=shape, compression='szip', fletcher32=False, shuffle=False)
        #Compression fails for some dtypes
        except ValueError:
            dset = outfile.create_dataset(object_name, shape, obj.dtype,
                                          maxshape=shape, fletcher32=False, shuffle=False)

        offset = 0
        widgets[0] = object_name
        pbar = pb.ProgressBar(widgets=widgets, maxval=num_vars).start()
        for chrom in chroms:
            chrom_obj = infile[chrom][object_name]
            chrom_len = len(chrom_obj)
            #Process in chunk sized (at least on the primary dimension) pieces
            step_size = dset.chunks[0]
            for start in xrange(0, chrom_len, step_size):
                end = min(start + step_size, chrom_len)
                if len(shape) == 2:
                    dset[offset + start:offset + end, :] = chrom_obj[start:end, :]
                elif len(shape) == 1:
                    dset[offset + start:offset + end] = chrom_obj[start:end]
                else:
                    print "shape", shape, "not of dimension 1 or 2"
                pbar.update(offset+end)
            offset += chrom_len
        pbar.finish()

infile[chroms[0]].visit(copy)

infile.close()
outfile.close()