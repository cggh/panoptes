from Bio import SeqIO
def readChromLengths(fasta):
    with open(fasta, 'r') as fastaFile:
        return {fasta.id: len(fasta.seq) for fasta in SeqIO.parse(fastaFile, 'fasta')}
