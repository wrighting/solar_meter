COOKIES=cookies
METER_NO=$1
PASSWORD=$2

ID=`curl -v -X POST --data "mtrnum=${METER_NO}&passcode=${PASSWORD}" -c ${COOKIES} http://www.ss4meteronline.co.uk/logValMob.asp 2>&1 | grep Location: | awk -F\& '{print $2}'`

curl -v -b ${COOKIES} "http://www.ss4meteronline.co.uk/showMeterRdgs2.asp?${ID}&serv=Daily&gen="
curl -v -b ${COOKIES} http://www.ss4meteronline.co.uk/saveCSV2.asp > readings.csv
