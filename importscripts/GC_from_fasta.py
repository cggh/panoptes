#Usage python GC_from_fasta file [window_size]
from collections import Counter

from pyfasta import Fasta
import sys


f = Fasta(sys.argv[1], key_fn=lambda key: key.split()[0])
window_size = 301 if len(sys.argv) < 3 else int(sys.argv[2])
if not (window_size % 2):
    window_size += 1
out = open(sys.argv[1]+'.GC', 'w')
for chrom in f.keys():
    print chrom
    length = len(f[chrom])
    start = 0
    while start < length:
        c = Counter(f[chrom][start:start+window_size])
        try:
            out.write('\t'.join(map(str, [chrom, start + (window_size-1)/2, float(c['G'] + c['C'] + c['g'] + c['c']) / float(c['G'] + c['C'] + c['g'] + c['c']+ c['t'] + c['T'] + c['a'] + c['A'])])) + '\n')
        except ZeroDivisionError:
            pass
        start += window_size

