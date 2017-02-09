.. _def-source-twoddatatable:

2D data table source files
~~~~~~~~~~~~~~~~~~~~~~~~~~

In the :ref:`dataset source folder<def-source-dataset>` folder, a subfolder ``2D_datatables`` should be present.
This is the root for a set of folders, each one describing an individual :ref:`2D data table<dataconcept_twoddatatable>`,
with the name of the folder serving as an identifier.

In each *2D data table* folder, a zarr DirectoryStore ``data.zarr`` should be present, containing the arrays of properties.
(`example file
<https://github.com/cggh/panoptes/blob/master/sampledata/datasets/Genotypes/2D_datatables/genotypes/data.zarr>`_).

In addition, a yaml ``settings`` file should be present in the *2D data table* folder (see :ref:`def-settings-twoddatatable`).


Zarr source file structure
..........................
The source DirectoryStore ``data.zarr`` may contain the following arrays:


Properties arrays
   One or more arrays specifying properties of the 2D data table. Note that these arrays can be 3D but the first two dimensions should be row and column.

Column index 1D array
   A 1D array listing the identifiers of all columns, in the order they are used in the properties matrices.

Row index 1D array
   A 1D array listing the identifiers of all rows, in the order they are used in the properties matrices.

Only scalar builtin dtypes (ie not structured with fields or user-defined) or strings currently permitted for zarr arrays.

Example python zarr creation code:

.. code:: python

    import zarr
    store = zarr.DirectoryStore(output_dir)
    root_grp = zarr.group(store, overwrite=True)
    call = outfile.create_dataset("call", shape=(1000,10,2), dtype='i1')
    call[:,:,:] = my_array_of_calls
    allele_depth = outfile.create_dataset("allele_depth", shape=(1000,10,3), dtype='i2')
    allele_depth[:,:,:] = my_array_depth
    quality = outfile.create_dataset("quality", shape=(1000,10), dtype='i4')
    quality[:,:] = my_array_of_quality

We recommend using `VCFNP <https://github.com/alimanfoo/vcfnp>`_ for converting from VCF. See the `VCF example <https://github.com/cggh/panoptes/tree/master/sampledata/datasets/vcf_example>`_ for details of how to do this.


See also
........

- :ref:`dataconcept_datatable`
- :ref:`def-source-data`
