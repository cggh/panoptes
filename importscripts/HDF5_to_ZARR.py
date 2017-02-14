"""
Usage: HDF5_TO_ZARR.py IN OUT

"""

from docopt import docopt
import h5py
import zarr

if __name__ == '__main__':
    arguments = docopt(__doc__)
    with h5py.File(arguments['IN']) as input_file:
        store = zarr.DirectoryStore(arguments['OUT'])
        root_grp = zarr.group(store, overwrite=True)
        def copy(name):
            hdf_array = input_file[name]
            if type(hdf_array) is h5py._hl.dataset.Dataset:
                print name
                zarr_array = root_grp.empty_like(name, hdf_array)
                zarr_array[:] = hdf_array
        input_file.visit(copy)
        


