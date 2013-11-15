#!/bin/bash -e
mysql -h$DBHOST -u$DBUSER -p$DBPASS -e "DROP DATABASE IF EXISTS datasetindex;CREATE DATABASE datasetindex;"
mysql -h$DBHOST -u$DBUSER -p$DBPASS -Ddatasetindex < default.sql
mysql -h$DBHOST -u$DBUSER -p$DBPASS -e "DROP DATABASE IF EXISTS pf21viewtracks;CREATE DATABASE pf21viewtracks;"
mysql -h$DBHOST -u$DBUSER -p$DBPASS -Dpf21viewtracks < default2.sql
