import sys
from os import listdir
from os.path import join

import yaml
import config

dataset = sys.argv[1]
datatables = join(config.SOURCEDATADIR, "datasets", dataset, 'datatables')

tables = {}
for datatable in listdir(datatables):
    with open(join(datatables, datatable, 'settings')) as f:
        s = yaml.load(f)
        props = {}
        for p in s['properties']:
            if ',' in p['id']:
                ids = p['id'].split(',')
                for id in ids:
                    id = id.strip()
                    props[id] = {**props.get(id, {}), **p}
            else:
                id = p['id']
                props[id] = {**props.get(id, {}), **p}
    tables[datatable] = s
    tables[datatable]['props'] = props
for id, table in tables.items():
    print('Table', id, '{')
    for id, prop in sorted(table['props'].items()):
        if 'relation' in prop:
            print('  ', id, prop['dataType'], '[ref: > ', prop['relation']['tableId']+'.'+tables[prop['relation']['tableId']]['primKey']+']')
        else:
            print('  ', id, prop['dataType'])
    print('}')