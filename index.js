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

/*** ============================================================================ */
/** =========================== PROJECT.INIT ACTIONS =========================== **/
/* ============================================================================ ***/

var project_file_name = "projects.json";

var openProjects = function(){
	var data = fs.readFileSync(project_file_name, 'utf8');
	console.log("DATA", data);
	return eval(JSON.parse(data));
}

var projects = openProjects();

/*** ============================================================================ */
/** ========================== PROJECT.UPDATE ACTIONS ========================== **/
/* ============================================================================ ***/

var saveProjects = function(){

	var projects_str = JSON.stringify(projects, null, 4);

	fs.writeFile(project_file_name, JSON.stringify(projects_str), function(err) {
		console.log(err);
	}); 
}

var find_new_projects = function(){

}

var update_project = function(i, project){
	var project = new KS.project(project.url);
	project.timeLeft(function(err, data){
		if(data.timeLeft<=0){
			project.isActive = false;
		}
		else{
			project.isActive = true;
		}
		projects[i] = project;
		saveProjects();
	});
}

var update_projects = function(){
	var i = projects.length;
	while(i--){
		update_project(i, projects[i]);
	}
	find_new_projects();
}

/*** ============================================================================ */
/** =============================== SCRAP ACTIONS ============================== **/
/* ============================================================================ ***/

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
		if(projects[i].isActive || projects[i].isActive == undefined){
			processOne(projects[i].filename, projects[i].url);
		}
		
	}
	num_runs++;
	console.log("NUMBER OF RUNS:", num_runs);
}

/*** ============================================================================ */
/** ================================ GIT ACTIONS =============================== **/
/* ============================================================================ ***/

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

/*** ============================================================================ */
/** ============================= INTERVAL CONTROL ============================= **/
/* ============================================================================ ***/

setInterval(processAll, ten_min); //SCRAP DATA
setInterval(update_projects, one_hour);



