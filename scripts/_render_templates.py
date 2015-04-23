from jinja2 import Environment, FileSystemLoader
import sys
import config as config_file


config = dict((k,v) for k, v in config_file.__dict__.iteritems()
              if not k.startswith('_'))

config['PRODUCTION'] = sys.argv[1] == 'PRODUCTION'
if not config['PRODUCTION']:
    config['TITLE'] += " - DEVELOPMENT MODE"
config['VERSION'] = sys.argv[2]
env = Environment('<%', '%>', '<%=', '%>', '<%#', '%>', loader=FileSystemLoader('webapp'))
template = env.get_template('index.html.template')
output_from_parsed_template = template.render(**config)

# to save the results
with open("webapp/index.html", "wb") as fh:
    fh.write(output_from_parsed_template)
