NUM_SAMPLES = 20
NUM_VARIANTS = 20#1000

import errno
import csv
import random
import os
import h5py
import numpy as np


def mkdir(name):
    try:
        os.makedirs(name)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
            # pic.put(color, (xc + x, yc + y))
            # pic.put(color, (xc - x, yc + y))
            # pic.put(color, (xc + x, yc - y))
            # pic.put(color, (xc - x, yc - y))


def quadrant_points(rx, ry):
    #set the center of circle
    x = 0
    y = ry
    p = (ry * ry) - (rx * rx * ry) + ((rx * rx) / 4)
    while (2 * x * ry * ry) < (2 * y * rx * rx):
        yield x, y
        if p < 0:
            p = p + (2 * ry * ry * x) + (ry * ry)
        else:
            p = p + (2 * ry * ry * x + ry * ry) - (2 * rx * rx * y)
            y -= 1
        x += 1
    p = (x + 0.5) * (x + 0.5) * ry * ry + (y - 1) * (y - 1) * rx * rx - rx * rx * ry * ry
    while y >= 0:
        yield x, y
        if p > 0:
            p = p - (2 * rx * rx * y) + (rx * rx)
        else:
            x += 1
            p = p + (2 * ry * ry * x) - (2 * rx * rx * y) - (rx * rx)
        y -= 1


def ellipse_points(sx, sy, r):
    xr = r * (((sx - 1) / 2) - 1)
    yr = r * ((sy - 0.5) / 2)
    xc = (sx - 1) / 2
    yc = (sy - 1) / 2
    for x, y in quadrant_points(xr, yr):
        yield xc + x, yc + y
    for x, y in quadrant_points(xr, yr):
        yield xc - x, yc + y
    for x, y in quadrant_points(xr, yr):
        yield xc - x, yc - y
    for x, y in quadrant_points(xr, yr):
        yield xc + x, yc - y


mkdir('datatables')
mkdir('datatables/samples')
mkdir('datatables/variants')

sample_ids = ['SID_' + str(i).zfill(6) for i in range(NUM_SAMPLES)]
var_ids = ['VAR_' + str(i).zfill(6) for i in range(NUM_VARIANTS)]

with open('datatables/samples/data', 'w') as tabfile:
    writer = csv.writer(tabfile, delimiter='\t')
    writer.writerow(('ID', ))
    for id in sample_ids:
        writer.writerow((id, ))

with open('datatables/variants/data', 'w') as tabfile:
    writer = csv.writer(tabfile, delimiter='\t')
    writer.writerow('chrom pos SnpName Value1 Value2 Value3 Extra1'.split())
    for i in range(NUM_VARIANTS):
        writer.writerow(('Pf3D7_01_v3',
                         random.randint(0, 20000),
                         var_ids[i],
                         random.random(),
                         random.random(),
                         random.random(),
                         random.choice(['A', 'B', 'C', 'D']),
        ))

#Create arrays of diploid genotypes that are all ref, each row is a sample
#Need int8 as -1 is missingness
first_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")
second_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")
#Draw an arrow to 0,0 of missingness
first_allele[0:min(10, NUM_SAMPLES), 0] = -1
second_allele[0:min(10, NUM_SAMPLES), 0] = -1
first_allele[0, 0:min(10, NUM_VARIANTS)] = -1
second_allele[0, 0:min(10, NUM_VARIANTS)] = -1
for i in range(10):
    first_allele[i, i] = -1
    second_allele[i, i] = -1
#Then an ellipse of non-ref on both alleles
for count, (x, y) in enumerate(ellipse_points(NUM_VARIANTS, NUM_SAMPLES, 1)):
    genotype = (count % 9) + 1
    first_allele[y, x] = genotype
    second_allele[y, x] = genotype
#Then an ellipse of non-ref on each alleles
count = 0
for count, (x, y) in enumerate(ellipse_points(NUM_VARIANTS, NUM_SAMPLES, 0.75)):
    genotype = (count % 9) + 1
    first_allele[y, x] = genotype
for count, (x, y) in enumerate(ellipse_points(NUM_VARIANTS, NUM_SAMPLES, 0.6)):
    genotype = (count % 9) + 1
    second_allele[y, x] = genotype


#We now want to shuffle the array to check that the import process is able to map the
#primary keys properly - for actual data you'll want the order to be the most common access
#order - eg genomic position.
var_shuffle = range(NUM_VARIANTS)
random.shuffle(var_shuffle)
sample_shuffle = range(NUM_SAMPLES)
random.shuffle(sample_shuffle)
shuffled_var_ids = [var_ids[i] for i in var_shuffle]
shuffled_sample_ids = [sample_ids[i] for i in sample_shuffle]
shuffled_first_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")
shuffled_second_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")
for i,s in enumerate(sample_shuffle):
    for j,v in enumerate(var_shuffle):
        shuffled_first_allele[i,j] = first_allele[s,v]
        shuffled_second_allele[i,j] = second_allele[s,v]

with h5py.File('2D_datatables/data.hdf5', 'w') as f:
    col_index = f.create_dataset("col_index", (NUM_VARIANTS,), dtype='S10')
    col_index[:] = shuffled_var_ids
    row_index = f.create_dataset("row_index", (NUM_SAMPLES,), dtype='S10')
    row_index[:] = shuffled_sample_ids
    first_allele = f.create_dataset("first_allele", (NUM_SAMPLES, NUM_VARIANTS), dtype='int8')
    first_allele[:, :] = shuffled_first_allele
    second_allele = f.create_dataset("second_allele", (NUM_SAMPLES, NUM_VARIANTS), dtype='int8')
    second_allele[:, :] = shuffled_second_allele