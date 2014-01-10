// Require all dependencies
require([  "dojo/_base/lang", "dojo/dom-construct", "dojo/dom", "dojo/topic",
		"dijit/layout/ContentPane", "dojox/layout/TableContainer",
		"dojox/charting/widget/Legend","dojox/charting/action2d/Tooltip", "dojox/grid/DataGrid",
		"dojo/data/ObjectStore", "dojo/store/DataStore", "dojo/store/Memory", "dojox/charting/Chart",
		"dojox/charting/themes/Claro", "dojo/store/Observable",
		"dojox/data/CsvStore", "dojox/charting/StoreSeries",
		"dojox/charting/plot2d/Lines", "dojox/charting/axis2d/Default",
		"dojo/domReady!" ], function(lang, domConstruct, dom, topic, ContentPane, TableContainer, Legend, Tooltip, DataGrid, ObjectStore, DataStore, Memory,
		Chart, Claro, Observable, CsvStore, StoreSeries) {

	// Create the data store
	// Store information in a data store on the client side
	var dataStore = CsvStore({
		url : "readings.csv"
	});

	function timeStampToDate(timestamp) {
		var dp = timestamp.split('/');
		var year = parseInt(dp[2].substr(0,2));
		year += 2000;
		var d = new Date(year, dp[1] - 1, dp[0]);
		return (d);
	};
	dataStore.comparatorMap = {};
	dataStore.comparatorMap["TimeStamp"] = function(a,b){
	  a = timeStampToDate(a);
	  b = timeStampToDate(b);
	  return (a - b);
	};
	dataStore.comparatorMap["TotalValue"] = function(a,b){
	  a = parseFloat(a);
	  b = parseFloat(b);
	  return (a - b);
	};
	dataStore.comparatorMap["IncTotalValue"] = function(a,b){
	  a = parseFloat(a);
	  b = parseFloat(b);
	  return (a - b);
	};
	var weekNo = 0;

	var mstore = Observable(new Memory());
	var dstore = new DataStore({
		store : dataStore
	});
	topic.subscribe("weekLoaded", function () {
		outputStats(mstore, weekNo);
	});
	function calculateFIT(start, end) {
		var units = start["weeklyTotal"];
		if (end) {
			units = end["total"] - start["total"];
		}
		var base = 39.6;
		var feedIn = 3.2;
		qt = ((units * base) + ((units/2) * feedIn)) / 100;
		return (qt.toFixed(2));
	}
	var lastValue = 0;
	var lastWeeklyTotal = 0;
	dstore.query().forEach(function(reading) {
		var d = timeStampToDate(reading["TimeStamp"]);
		//Only collect values for first day of week
		//if (d.getDay() == 1) {
			reading["year"] = d.getFullYear();
			reading["weekOfYear"] = d.getWeek();
			reading["dayOfWeek"] = d.getDay();
			reading["weekNo"] = weekNo++;
			var read = reading["IncTotalValue"];
			// Account for first week
			if (read == undefined) {
				read = reading["TotalValue"];
			}
			reading["reading"] = parseFloat(read);
			reading["total"] = parseFloat(reading["TotalValue"]);
			//Do our own calculation as using weekly totals not daily 
			reading["reading"] = reading["total"] - lastValue;
			lastValue = reading["total"];
			reading["weeklyTotal"] = reading["total"] - lastWeeklyTotal;
			if (d.getDay() == 1) {
				lastWeeklyTotal = reading["total"];
			}
		// dstore.put(reading, { overwrite: true });
			mstore.add(reading, { id: weekNo - 1 });
		//}

	}).then(function () {
		topic.publish("weekLoaded");
	});

	var years = [ "2011", "2012", "2013", "2014" ];
	function showWeeklyTotals(container, weekStore, weekNo, text) {
		var count = 0;
		
		weekStore.query({weekOfYear: weekNo, dayOfWeek: 1}).forEach(function (previousYear) {
			var d = timeStampToDate(previousYear["TimeStamp"]);
			var year = d.getFullYear();
			var y1 = parseInt(years[count]);
			if (count == 0 && year != years[count]) {
		//		domConstruct.create("div", { innerHTML: "" }, container);
			}
			count++;
			var output = text;
			output += year + ": ";
			output += previousYear["weeklyTotal"].toFixed(2);
			output += " (&pound; " + calculateFIT(previousYear) + ")";
			//domConstruct.create("div", { innerHTML: text }, container);
    			var cell = new ContentPane({
      				content: output
    			});
			container.addChild(cell);
		});
		return text;
	}
	function outputStats(weekStore, weekNo) {

		var quarter = weekStore.get(weekNo - 14);
		var lastWeek = weekStore.get(weekNo - 2);
		var latest = weekStore.get(weekNo - 1);
		var qTotal = latest["total"] - quarter["total"];
		var node = dom.byId("totals");
		var tbl = new TableContainer( {
						cols: 3,
						}, node);
		showWeeklyTotals(tbl, weekStore, latest["weekOfYear"], "This week in ");
		showWeeklyTotals(tbl, weekStore, lastWeek["weekOfYear"], "Previous week in ");	
		
		var qt = ((qTotal * 39.6) + ((qTotal/2) * 3.2)) / 100;
		var q = domConstruct.create("div", { innerHTML: "This quarter :" + qTotal.toFixed(2) + " (&pound; " + calculateFIT(quarter,latest) + ")"}, node);
//console.log(qTotal.toFixed(2));
//console.log(results);
	};

	var store = dstore;
	// Create the chart within it's "holding" node
	// Global so users can hit it from the console
	var chart = new Chart("chartNode");

	// Set the theme
	chart.setTheme(Claro);
	// Add the only/default plot
	chart.addPlot("default", {
		type : "Lines",
		markers : true
	});

	var tip = new Tooltip(chart, "default");
	// Add axes
	chart.addAxis("x", {
		microTickStep : 1,
		minorTickStep : 1,
		max : 60
	});
	chart.addAxis("y", {
		vertical : true,
		fixLower : "major",
		fixUpper : "none",
		minorTickStep : 1,
		min : 0
	});
	var currentTotal = 0;

	for (i = 0; i < years.length; i++) {
		filter = "*" + years[i] + "*";
		var year = { year: years[i], currentTotal: currentTotal };
		var filter = dojo.hitch(year, 
			function(object) {
				var d = timeStampToDate(object["TimeStamp"]);
		//Only collect values for first day of week
		if (d.getDay() == 1 && d.getFullYear() == this.year) {
					return true;
				} else {
					return false;
				}
						});
		var seriesValues = dojo.hitch(year,
	function (item, store) {
		var reading = parseFloat(item["total"]) - this.currentTotal;

		// Account for first week

		if (reading <= 0) {
			reading = parseFloat(item["reading"]);
		}
		
		if (reading > 200) {
			reading = 0;
		}

		this.currentTotal = parseFloat(item["total"]);

		// let's create our object
		var o = {
			y : reading,
			x : item["weekOfYear"],
			tooltip : item["TimeStamp"].substr(0, 8) + " "
					+ reading.toFixed(2),
			color : "red"
		};
		// we can massage the object, if we want, and return it
		return o;
	}
		);
		var series = new StoreSeries(mstore, {
			//query : { TimeStamp : filter }
			query: filter
		}, seriesValues);
		chart.addSeries("y" + i, series);
		//This doesn't work as the series hasn't yet been filtered
		currentTotal = year.currentTotal;
	}
	// Render the chart!
	chart.render();

	function timeStampFormatter (timestamp) {
		return timestamp.substr(0,8);
	}
	var grid = new DataGrid({
		store : dataStore,
		structure : [ {
			name : "Date",
			field : "TimeStamp",
			width : "150px",
			formatter: timeStampFormatter
		}, {
			name : "Total",
			field : "TotalValue"
		}, {
			name : "Weekly Reading",
			width : "150px",
			field : "IncTotalValue"
		} ]
	}, "grid");
	grid.startup();

});

