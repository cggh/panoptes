#find ../sampledata -type f -name "settings" | xargs -i python migrate-settings.py {}

import ruamel.yaml
import sys

with open(sys.argv[1], 'r') as f:
    yaml = ruamel.yaml.load(f.read(), ruamel.yaml.RoundTripLoader)

def toNewCase(key, parent):
    if parent == 'CategoryColors':
        return key
    if key == '2D_DataTables':
        return 'twoD_DataTables'
    return key[0].lower() + key[1:]

def changeCase(yaml, parent=None):
    if isinstance(yaml, ruamel.yaml.comments.CommentedMap):
        for key in yaml:
            changeCase(yaml[key], key)
        yaml.ca._items = {toNewCase(key, parent):value for key, value in yaml.ca.items.items()}
        for key in yaml.keys():
            yaml.rename(key, toNewCase(key, parent))
    if isinstance(yaml, ruamel.yaml.comments.CommentedSeq):
        for value in yaml:
            changeCase(value)


changeCase(yaml)
with open(sys.argv[1], 'w') as f:
    f.write(ruamel.yaml.dump(yaml, Dumper=ruamel.yaml.RoundTripDumper))