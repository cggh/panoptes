#!/bin/bash
#Find out where this script is
SCRIPT_PATH="${BASH_SOURCE[0]}";
if ([ -h "${SCRIPT_PATH}" ]) then
  while([ -h "${SCRIPT_PATH}" ]) do SCRIPT_PATH=`readlink "${SCRIPT_PATH}"`; done
fi
pushd . > /dev/null
cd `dirname ${SCRIPT_PATH}`
#We are now at the dir of the script go one up to project
cd ..
PROJECT_ROOT=`pwd`;

if [ 1 = 1 ]
then
source build/virtualenv/bin/activate
PYTHONPATH=${PROJECT_ROOT}/build/DQXServer
export PYTHONPATH

cd build/DQXServer/customresponders/panoptesserver/importer

python ImportFiles.py dataset all Samples_and_Variants

fi

popd
for i in regions populations samplingsites variants sampletypes samples
do
HEADER=/tmp/${i}.header
DATA=/tmp/${i}

sudo rm ${DATA} ${HEADER}
mysql -u root -e "(select GROUP_CONCAT(COLUMN_NAME order BY ORDINAL_POSITION SEPARATOR '\\t') INTO OUTFILE '${HEADER}' from INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${i}' AND TABLE_SCHEMA = 'Samples_and_Variants')"
mysql -u root -e "SELECT * INTO OUTFILE '${DATA}' FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\n' FROM Samples_and_Variants.${i};"

SRC_FILE=/data/panoptes/source/datasets/Samples_and_Variants/datatables/${i}/data
CMP_DATA=data.$$
CMP_HEAD=head.$$
DB_HEAD=db_head.$$
CMP=db_data.$$
TMP=tmp.$$
echo "Comparing ${SRC_FILE} with db"
sed -e 's/\\\t/\t/g' ${HEADER} > ${DB_HEAD}
tail -n +2 ${SRC_FILE} | sed -e 's/\tYes\t/\t1\t/' -e 's/\tY\t/\t1\t/' -e 's/\tN\t/\t0\t/' -e 's/\tNo\t/\t0\t/' -e 's/\t\t/\t\\N\t/g' > ${CMP_DATA}
head -1 ${SRC_FILE} | sed -e 's/ /_/g' > ${CMP_HEAD}
if [ ${i} == 'samplingsites' ]
then
	cat ${DB_HEAD} | awk 'BEGIN{OFS="\t";} { t = $3; $3 = $4; $4 = t; print; } ' > ${TMP}
	rm ${DB_HEAD}
	mv ${TMP} ${DB_HEAD}
	cat ${CMP_DATA} | awk 'BEGIN{OFS="\t";} $2 =="\\N" { $2 = ""} { t = $3; $3 = $4; $4 = t; print; } ' | sed -e 's/51\.50/51\.5/' > ${TMP}
	rm ${CMP_DATA}
	mv ${TMP} ${CMP_DATA}
fi
if [ ${i} == 'samples' ]
then
#Value2 column not loaded
#Columns transposed
	cat ${DB_HEAD} | awk 'BEGIN{OFS="\t";} { t = $3; $3 = $4; $4 = t; print; } ' > ${TMP}
	rm ${DB_HEAD}
	mv ${TMP} ${DB_HEAD}
	cat ${CMP_DATA} | awk 'BEGIN{OFS="\t";} { t = $3; $3 = $4; $4 = t; print; } ' | cut -f -4,6- > ${TMP}
	rm ${CMP_DATA}
	mv ${TMP} ${CMP_DATA}
	cat ${CMP_HEAD} | cut -f -4,6- > ${TMP}
	rm ${CMP_HEAD}
	mv ${TMP} ${CMP_HEAD}
fi
if [ ${i} == 'variants' ]
then
#Column 8 is text so is an empty string not null
	cat ${CMP_DATA} | awk -F'\t' 'BEGIN{OFS="\t";} $8 == "\\N" { $8 = ""} {print}' > ${TMP}
	rm ${CMP_DATA}
	mv ${TMP} ${CMP_DATA}
fi

diff ${DB_HEAD} ${CMP_HEAD}
if [ $? -eq 1 ]
then
	echo "Differences found"
else
	echo "OK"
fi
cat ${DATA} > ${CMP}
diff -w ${CMP_DATA}  ${DATA}

if [ $? -eq 1 ]
then
	echo "Differences found"
else
	echo "OK"
fi
rm ${CMP_HEAD} ${CMP_DATA} ${DB_HEAD} ${CMP}
done

TABLES=/tmp/tables
sudo rm $TABLES
mysql -u root -e "select TABLE_NAME,TABLE_ROWS INTO OUTFILE '${TABLES}' from information_schema.TABLES where table_schema ='Samples_and_Variants';"

echo "Comparing database table sizes"
diff testdata/Samples_and_Variants.tables ${TABLES}
if [ $? -eq 1 ]
then
	echo "Differences found"
else
	echo "OK"
fi
