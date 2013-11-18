#!/bin/bash -e
echo mysql -h$DBHOST -u$DBUSER -p$DBPASS < default.sql
mysql -h$DBHOST -u$DBUSER -p$DBPASS < default.sql 

