NUM_SAMPLES = 10
NUM_VARIANTS = 1000

import os
import errno
import csv

def mkdir(name):
    try:
        os.makedirs(name)
    except OSError as exception:
        if exception.errno != errno.EEXIST:
            raise
mkdir('datatables')
mkdir('datatables/samples')
mkdir('datatables/variants')

with open('datatables/samples/data', 'w') as tabfile:
    writer = csv.writer(tabfile, delimiter='\t')
    writer.writerow(('ID', ))
    for i in range(NUM_SAMPLES):
        writer.writerow(('ID'+str(i).zfill(6), ))

# with open('datatables/variants/data', 'w') as tabfile:
#     writer = csv.writer(tabfile, delimiter='\t')
#     writer.writerow(('ID', ))
#     for i in range(NUM_SAMPLES):
#         writer.writerow(('ID'+str(i).zfill(6), ))
