var KS = require("kickstarter");
var fs = require("fs");
var exec = require('child_process').exec;
var sys = require('sys')

var one_min = 1000*60;
var ten_min = one_min*10;
var one_hour = one_min*60;

var num_adds = 0;
var num_runs = 0;
var num_git_add = 0;
var num_git_push = 0;

/*** ============================================================================ */
/** ================================== HELPERS ================================= **/
/* ============================================================================ ***/

var error = function(where, err){
	console.log("ERROR", where, err);
}

var make_filename = function(projectUrl){
	var s = projectUrl.indexOf("projects/");
	var fn = projectUrl.substring(s+9);
	return fn.replace("/", "_");
}

var make_csv_path = function(filename){
	return "projects/"+filename+".csv";
}

var make_json_path = function(filename){
	return "projects/"+filename+".json";
}

var num_projects_pending = 0;

var add_project = function(filename, project){
	num_projects_pending++;
	var newProject = {};
	newProject.csvPath = make_csv_path(filename);
	newProject.url = project.url;
	newProject.rewards = {};
	project.goal(function(err, data){
		num_projects_pending--;
		newProject.goal = data.goal;
		projects[filename] = newProject;
		if(num_projects_pending==0){
			num_adds++;
			console.log("PROJECT LIST UPDATE: "+num_adds);
			saveProjects();
		}
	});
}

var add_projects = function(newProjects){
	var filenames = Object.keys(newProjects);
	var i = filenames.length;

	while(i--){
		var filename = filenames[i];
		var project = newProjects[filename];
		add_project(filename, project);
	}
}

var saveProjects = function(){

	var projects_str = JSON.stringify([projects], null, 4);

	fs.writeFile(project_file_name, JSON.stringify(projects_str), function(err) {
		if(err){
			error("SAVE: "+project_file_name, err);
		}
		console.log("NUMBER OF PROJECTS", Object.keys(projects).length);
	}); 
}

/*** ============================================================================ */
/** =========================== PROJECT.INIT ACTIONS =========================== **/
/* ============================================================================ ***/

var project_file_name = "projects.json";

var openProjects = function(){
	var data = fs.readFileSync(project_file_name, 'utf8');
	var ps = eval(JSON.parse(data));
	return ps[0];
}

var projects = openProjects();

if( Object.prototype.toString.call( projects ) === '[object Array]' ) {
	var newProjectsObj = {};
	var i = projects.length;
	while(i--){
		var filename = make_filename(projects[i].url);
		var newProject = {};
		newProject.csvPath = projects[i].filename;
		newProject.rewards = {};
		newProject.goal = "?";
		newProject.url = projects[i].url;
		newProjectsObj[filename] = newProject;
	}
	projects = newProjectsObj;
	saveProjects();
}

/*** ============================================================================ */
/** ========================== PROJECT.UPDATE ACTIONS ========================== **/
/* ============================================================================ ***/

var find_new_projects = function(discover, newProjects){
	if(newProjects==undefined){
		newProjects = {};
	}

	var callback = function(errs, data){
		var allGathered = false;
		var i = data.length;
		while(i--){
			var err = errs[i];
			if(Object.keys(err)>0){
				error("DISCOVERGATHERERROR", err);
			}
			else{
				var project = data[i];
				var filename = make_filename(project.projectUrl);
				if(newProjects[filename]==undefined&&projects[filename]==undefined){
					newProjects[filename] = project.project;
				}
				else{
					allGathered = true;
				}
			}
		}

		if(!allGathered && discover.page < 5){
			find_new_projects(discover.nextPage(), newProjects);
		}
		else{
			add_projects(newProjects);
		}
	}

	discover.request(callback);
}

var update_project = function(i, project){
	var ks_project = new KS.project(project.url);
	ks_project.timeLeft(function(err, data){
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
	var discover = new KS.discover().byGeneral("recentlyLaunched").projectUrl().project();
	find_new_projects(discover, {});
}

/*** ============================================================================ */
/** =============================== SCRAP ACTIONS ============================== **/
/* ============================================================================ ***/

var dpToRow = function(time, pledged, dp){
	var row = [time];
	var cols = [
	 	"soldOut",
	 	"maxBackers",
	 	"isLimited",
	 	"numBackers",
	 	"minPledged",
		"_id",
	];

	var num_cols = cols.length;
	while(num_cols--){
		var cell = dp[cols[num_cols]];
		row.push(cell);
	}

	row.push(pledged);

	var out = row.join(",")+"\n";

	return out;
}

var saveCsv = function(filename, csvPath, data){
	var time = Date.now();
	var pledged = data.pledged;
	var numDataPoints = data.rewards.length;
	while(numDataPoints--){
		var dp = data.rewards[numDataPoints];

		if(projects[filename].rewards[dp._id]==undefined){
			projects[filename].rewards[dp._id] = {started: Date.now(), desc:encodeURIComponent(dp.desc)};
		}
		
		var row = dpToRow(time, pledged, dp);

		fs.appendFile(csvPath, row, function(err){
			if(err){
				error("WRITE_TO_FILE", err);
			}
		});
	}
}

var processOne = function(filename){
	var url = projects[filename].url;
	var csvPath = projects[filename].csvPath;
	var project = new KS.project(url);
	project.pledged().rewards(function(err, data){
		if(err){
			error("KS_ERROR", err);
		}
		else{
			saveCsv(filename, csvPath, data);
		}
	});
}

var processAll = function(){
	var filenames = Object.keys(projects);
	var i = filenames.length;
	while(i--){
		var filename = filenames[i];
		if(projects[filename].isActive || projects[filename].isActive == undefined){
			processOne(filename);
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

processAll();
update_projects();

setInterval(processAll, ten_min); //SCRAP DATA
setInterval(update_projects, one_hour);



