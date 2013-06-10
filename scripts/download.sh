#!/bin/sh

PATH=/bin:/usr/bin
export PATH
COOKIES=cookies
METER_NO=$1
PASSWORD=$2

ID=`curl -v -X POST --data "mtrnum=${METER_NO}&passcode=${PASSWORD}" -c ${COOKIES} http://www.ss4meteronline.co.uk/logValMob.asp 2>&1 | grep Location: | awk -F\& '{print $2}'`

curl -b ${COOKIES} "http://www.ss4meteronline.co.uk/showMeterRdgs2.asp?${ID}&serv=Daily&gen=" > /dev/null 2>&1
curl -b ${COOKIES} http://www.ss4meteronline.co.uk/saveCSV2.asp | tail -n +2 | sed -e 's/ \([TV]*\)/\1/g' 
