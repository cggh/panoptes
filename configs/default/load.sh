#!/bin/bash -e
mysql -h$DBHOST -u$DBUSER -p$DBPASS < default.sql

