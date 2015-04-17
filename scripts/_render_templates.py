from jinja2 import Environment, FileSystemLoader
import sys
import config
improt json

config.debug = sys.argv[1] == 'DEBUG'
config.version = sys.argv[2]

env = Environment(loader=FileSystemLoader('webapp'))
template = env.get_template('index.html.template')
try:
    output_from_parsed_template = template.render(**config)
except KeyError:
    print('No PANOPTES_CONFIG environment variable set')
    exit()

print output_from_parsed_template
# to save the results
with open("webapp/index.html", "wb") as fh:
    fh.write(output_from_parsed_template)