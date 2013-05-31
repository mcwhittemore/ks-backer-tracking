var KS = require("kickstarter");
var fs = require("fs");
var exec = require('child_process').exec;
var sys = require('sys')

var one_min = 1000*60;
var ten_min = one_min*10;
var one_hour = one_min*60;

var num_runs = 0;
var num_git_add = 0;
var num_git_push = 0;

var projects = [
	{
		filename: "projects/infragram.csv",
		url:"http://www.kickstarter.com/projects/publiclab/infragram-the-infrared-photography-project"
	},
	{
		filename: "projects/telescope_arkyd.csv",
		url: "http://www.kickstarter.com/projects/1458134548/arkyd-a-space-telescope-for-everyone-0"
	},
	{
		filename: "projects/videogame_chalice.csv",
		url: "http://www.kickstarter.com/projects/doublefine/double-fines-massive-chalice"
	},
	{
		filename: "projects/short_stories_wc.csv",
		url: "http://www.kickstarter.com/projects/1636124895/30-short-short-stories-about-white-castle"
	},
	{
		filename: "projects/3D_printer_buccaneer.csv",
		url: "http://www.kickstarter.com/projects/pirate3d/the-buccaneer-the-3d-printer-that-everyone-can-use"
	},
	{
		filename: "projects/documentary_semi_serious.csv",
		url: "http://www.kickstarter.com/projects/630664473/very-semi-serious"
	},
	{
		filename: "projects/videogame_armikrog.csv",
		url: "http://www.kickstarter.com/projects/1949537745/armikrog"
	}
];


var dpToRow = function(time, dp){
	var row = [time];
	var cols = [
		"desc",
	 	"soldOut",
	 	"maxBackers",
	 	"isLimited",
	 	"numBackers",
	 	"minDonated",
		"_id",
	];

	var num_cols = cols.length;
	while(num_cols--){
		var cell = dp[cols[num_cols]];
		cell = encodeURIComponent(cell);
		row.push(cell);
	}

	var out = row.join(",")+"\n";

	return out;
}

var error = function(where, err){
	console.log("ERROR", where, err);
}

var save = function(filename, data){
	var time = Date.now();
	var numDataPoints = data.rewards.length;
	while(numDataPoints--){
		var dp = data.rewards[numDataPoints];
		var row = dpToRow(time, dp);
		fs.appendFile(filename, row, function(err){
			if(err){
				error("WRITE_TO_FILE", err);
			}
		});
	}
}

var processOne = function(filename, url){
	var project = new KS.project(url);
	project.rewards(function(err, data){
		if(err){
			error("KS_ERROR", err);
		}
		else{
			save(filename, data);
		}
	});
}


var processAll = function(){
	var i = projects.length;
	while(i--){
		processOne(projects[i].filename, projects[i].url)
	}
	num_runs++;
	console.log("NUMBER OF RUNS:", num_runs);
}

setInterval(processAll, ten_min);
/*


var gitAddCommit = function(){
	exec("git add .", function(err, stid, stout){
		console.log("GIT ADD", err);
		sys.print(stid);
		sys.print(stout);
		exec("git commit -m 'automatic update "+Date.now()+"'", function(err, stid, stout){
			console.log("GIT COMMIT", err);
			sys.print(stid);
			sys.print(stout);
			exec("git push origin master", function(err, stid, stout){
				console.log("GIT PUSH", err);
				sys.print(stid);
				sys.print(stout);
			});
		});
	});
}

gitAddCommit();

*/