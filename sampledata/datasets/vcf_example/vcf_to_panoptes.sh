#!/bin/bash
set -xeou pipefail

vcf=${1}
mkdir -p datatables/variants
mkdir -p datatables/samples
mkdir -p 2D_datatables/genotypes

vcf2csv --vcf ${vcf} --dialect excel-tab --flatten-filter --fill "" > datatables/variants/data
vcf2npy --vcf ${vcf} --array-type variants
vcf2npy --vcf ${vcf} --array-type calldata_2d
vcfnpy2hdf5 --vcf ${vcf} --input-dir ${vcf}.vcfnp_cache --compression gzip --output 2D_datatables/genotypes/data.hdf5
python -c "import h5py;print 'sample_id';print '\n'.join(h5py.File('2D_datatables/genotypes/data.hdf5')['samples'][:])" > datatables/samples/data


rm -rf ${vcf}.vcfnp_cache
