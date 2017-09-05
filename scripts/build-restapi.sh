#!/bin/bash -e
source panoptes_virtualenv/bin/activate
cd server
pip install flask
pip install flask-restful