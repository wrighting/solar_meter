// Require all dependencies
require([  "dojo/dom-construct", "dojo/dom", "dojox/charting/widget/Legend","dojox/charting/action2d/Tooltip", "dojox/grid/DataGrid",
		"dojo/store/DataStore", "dojo/store/Memory", "dojox/charting/Chart",
		"dojox/charting/themes/Claro", "dojo/store/Observable",
		"dojox/data/CsvStore", "dojox/charting/StoreSeries",
		"dojox/charting/plot2d/Lines", "dojox/charting/axis2d/Default",
		"dojo/domReady!" ], function(domConstruct, dom, Legend, Tooltip, DataGrid, DataStore, Memory,
		Chart, Claro, Observable, CsvStore, StoreSeries) {

	// Create the data store
	// Store information in a data store on the client side
	var dataStore = CsvStore({
		url : "readings.csv"
	});

	function timeStampToDate(timestamp) {
		var dp = timestamp.split('/');
		var d = new Date(dp[2].substr(0, 4), dp[1] - 1, dp[0]);
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
	dstore.query().forEach(function(reading) {
		var d = timeStampToDate(reading["TimeStamp"]);
		reading["weekOfYear"] = d.getWeek();
		reading["weekNo"] = weekNo++;
		var read = reading["IncTotalValue"];
		// Account for first week
		if (read == undefined) {
			read = reading["TotalValue"];
		}
		reading["reading"] = parseFloat(read);
		reading["total"] = parseFloat(reading["TotalValue"]);
		var id = dstore.getIdentity(reading);
		// dstore.put(reading, { overwrite: true });
		mstore.add(reading);

	}).then(function () {

	var quarter = mstore.get(weekNo - 14);
	var lastWeek = mstore.get(weekNo - 2);
	var latest = mstore.get(weekNo - 1);
	var qTotal = latest["total"] - quarter["total"];
	var node = dom.byId("totals");
	var w = domConstruct.create("div", { innerHTML: "This week:" + latest["reading"].toFixed(2) }, node);
	mstore.query({weekOfYear: latest["weekOfYear"]}).forEach(function (previousYear) {
		domConstruct.create("div", { innerHTML: "This week in " + previousYear["TimeStamp"].substr(6,4) +":" + previousYear["reading"].toFixed(2) }, node);
	});
	
	var l = domConstruct.create("div", { innerHTML: "Last week:" + lastWeek["reading"].toFixed(2) }, node);
	var q = domConstruct.create("div", { innerHTML: "This quarter:" + qTotal.toFixed(2) }, node);
console.log(qTotal.toFixed(2));
//console.log(results);
	});
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
	function getValueObject(item, store) {
		var dp = item["TimeStamp"].split('/');
		var d = new Date(dp[2].substr(0, 4), dp[1] - 1, dp[0]);
		var reading = item["IncTotalValue"];
		// Account for first week
		if (reading == undefined) {
			reading = item["TotalValue"];
		}
		// let's create our object
		var o = {
			y : parseFloat(reading),
			x : d.getWeek(),
			tooltip : item["TimeStamp"].substr(0, 10) + " "
					+ item["IncTotalValue"],
			color : "red"
		};
		// we can massage the object, if we want, and return it
		return o;
	}
	var years = [ "2011", "2012", "2013" ];

	for (i = 0; i < years.length; i++) {
		filter = "*" + years[i] + "*";
		series = new StoreSeries(store, {
			query : {
				TimeStamp : filter
			}
		}, getValueObject);
		chart.addSeries("y" + i, series);
	}
	// Render the chart!
	chart.render();

	function timeStampFormatter (timestamp) {
		return timestamp.substr(0,10);
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

