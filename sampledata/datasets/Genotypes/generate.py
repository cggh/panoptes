# This file is part of Panoptes - (C) Copyright 2014, CGGH <info@cggh.org>
# This program is free software licensed under the GNU Affero General Public License.
# You can find a copy of this license in LICENSE in the top directory of the source code or at <http://opensource.org/licenses/AGPL-3.0>
from itertools import cycle, islice

NUM_SAMPLES = 100
NUM_VARIANTS = 2000

import errno
import csv
import random
random.seed("""
By convention sweetness, by convention bitterness, by convention colour, in reality only atoms and the void.
Foolish intellect! Do you seek to overthrow the senses, whilst using them for your evidence?
""")
import os
import h5py
import numpy as np


def mkdir(name):
    try:
        os.makedirs(name)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise

def quadrant_points(rx, ry):
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

with open('datatables/samples/data', 'wb') as tabfile:
    writer = csv.writer(tabfile, delimiter='\t', lineterminator='\n')
    writer.writerow(('ID', 'Name', 'Category1', 'Category2', 'Value1'))
    ctr = 0
    for id in sample_ids:
        ctr += 1
        writer.writerow((id, 
                         'Sample' + str(ctr),
                         'Group '+str(1+ctr/10),
                         random.choice(['Cat A', 'Cat B', 'Cat C']),
                         random.random()
    ))

gaps = list(np.random.poisson(10,(NUM_VARIANTS)))
pos = 10
with open('datatables/variants/data', 'w') as tabfile:
    writer = csv.writer(tabfile, delimiter='\t')
    writer.writerow('chrom pos SnpName Value1 Value2 Value3 Extra1'.split())
    for i, gap in zip(range(NUM_VARIANTS), gaps):
        writer.writerow(('Pf3D7_01_v3',
                         pos,
                         var_ids[i],
                         random.random(),
                         random.random(),
                         random.random(),
                         random.choice(['A', 'B', 'C', 'D']),
        ))
        gap = (random.randint(1,5) if random.uniform(0,1) > 0.1 else gap)
        pos = pos + gap

#Create arrays of diploid genotypes that are all ref, each row is a sample
#Need int8 as -1 is missingness
first_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")
second_allele = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int8")

#Draw an arrow to 0,0
first_allele[0:min(10, NUM_SAMPLES), 0] = -1
second_allele[0, 0:min(10, NUM_VARIANTS)] = -1
for i in range(10):
    first_allele[i, i] = -1
    second_allele[i, i] = -1
#Then some text that will check we are not flipped
coords = [(5, 5), (5, 6), (5, 7), (5, 8), (5, 9), (6, 5), (7, 5), (6, 7), (7, 7), (6, 9), (7, 9), (9, 6), (10, 6),
          (11, 6), (9, 8), (10, 8), (11, 8), (13, 5), (13, 6), (13, 7), (13, 8), (13, 9), (17, 5), (17, 6), (17, 7),
          (17, 8), (17, 9), (14, 6), (15, 7), (16, 6), (19, 6), (19, 7), (19, 8), (20, 5), (21, 5), (22, 5), (23, 5),
          (20, 9), (21, 9), (22, 9), (23, 9), (25, 5), (26, 5), (27, 5), (25, 7), (26, 7), (27, 7), (26, 6)]
for (y, x) in coords:
    first_allele[x+9, y] = -1
    second_allele[x+9, y] = -1

#Then an ellipse of non-ref on both alleles
for count, (x, y) in enumerate(ellipse_points(NUM_VARIANTS, NUM_SAMPLES, 1)):
    genotype = (count % 9) + 1
    x = min(NUM_VARIANTS-1, x)
    y = min(NUM_SAMPLES-1, y)
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

ref_depth = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int16")
alt_depth = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int16")
for i in xrange(NUM_SAMPLES):
    ref_depth[i, :] = list(islice(cycle(range(i+10)), NUM_VARIANTS))
    alt_depth[i, :] = list(islice(cycle(range(i+33,0,-1)), NUM_VARIANTS))

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
shuffled_ref_depth = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int16")
shuffled_alt_depth = np.zeros((NUM_SAMPLES, NUM_VARIANTS), dtype="int16")
for i,s in enumerate(sample_shuffle):
    for j,v in enumerate(var_shuffle):
        shuffled_first_allele[i,j] = first_allele[s,v]
        shuffled_second_allele[i,j] = second_allele[s,v]
        shuffled_ref_depth[i,j] = ref_depth[s,v]
        shuffled_alt_depth[i,j] = alt_depth[s,v]
shuffled_total_depth = shuffled_ref_depth + shuffled_alt_depth
shuffled_gq = np.array(np.random.randint(0,100,(NUM_SAMPLES, NUM_VARIANTS)), dtype="int16")

genotype = np.empty((NUM_SAMPLES, NUM_VARIANTS, 2), dtype="int8")
genotype[:, :, 0] = shuffled_first_allele
genotype[:, :, 1] = shuffled_second_allele
allele_depth = np.empty((NUM_SAMPLES, NUM_VARIANTS, 2), dtype="int16")
allele_depth[:, :, 0] = shuffled_ref_depth
allele_depth[:, :, 1] = shuffled_alt_depth

with h5py.File('2D_datatables/diploid/data.hdf5', 'w') as f:
    col_index = f.create_dataset("col_index", (NUM_VARIANTS,), dtype='S10')
    col_index[:] = shuffled_var_ids
    row_index = f.create_dataset("row_index", (NUM_SAMPLES,), dtype='S10')
    row_index[:] = shuffled_sample_ids
    gt = f.create_dataset("genotype", (NUM_SAMPLES, NUM_VARIANTS, 2), dtype='int8')
    gt[:, :, :] = genotype
    ad = f.create_dataset("allele_depth", (NUM_SAMPLES, NUM_VARIANTS, 2), dtype='int16')
    ad[:, :, :] = allele_depth
    total_depth = f.create_dataset("total_depth", (NUM_SAMPLES, NUM_VARIANTS), dtype='int16')
    total_depth[:, :] = shuffled_total_depth
    gq = f.create_dataset("gq", (NUM_SAMPLES, NUM_VARIANTS), dtype='int16')
    gq[:, :] = shuffled_gq

with h5py.File('2D_datatables/haploid/data.hdf5', 'w') as f:
    col_index = f.create_dataset("col_index", (NUM_VARIANTS,), dtype='S10')
    col_index[:] = shuffled_var_ids
    row_index = f.create_dataset("row_index", (NUM_SAMPLES,), dtype='S10')
    row_index[:] = shuffled_sample_ids
    gt = f.create_dataset("genotype", (NUM_SAMPLES, NUM_VARIANTS), dtype='int8')
    gt[:, :] = shuffled_first_allele
    ad = f.create_dataset("allele_depth", (NUM_SAMPLES, NUM_VARIANTS, 2), dtype='int16')
    ad[:, :, :] = allele_depth
    total_depth = f.create_dataset("total_depth", (NUM_SAMPLES, NUM_VARIANTS), dtype='int16')
    total_depth[:, :] = shuffled_total_depth
    gq = f.create_dataset("gq", (NUM_SAMPLES, NUM_VARIANTS), dtype='int16')
    gq[:, :] = shuffled_gq
