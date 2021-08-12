const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require("fs");

// ???? Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
    app.quit();
}

let window;

app.on('ready', () => 
{
    window = new BrowserWindow({
        width: 900,
        height: 600,
        minWidth: 750,
        minHeight: 500,
        webPreferences: {
            preload: p('preload.js')
        }
    });

    window.loadFile(p('index.html'));
    window.setMenu(null);

    window.webContents.openDevTools();
});

function p(x) {
    return path.join(__dirname, x);
}

function log(message) {
    window.webContents.send("log", `[NODE] ${message}`);
}

let runId = 0;

function run(command, after) {
    const { spawn } = require("child_process");

    
    let id = ++runId;
    log(`cmd (${id}): ${command}`);

    let proc = spawn(command, [], {shell: true});

    proc.stdout.on('data', (buf) => log(`(${id}) ${buf.toString()}`));
    proc.on('close', () => { log(`(${id}) done`); after(); });
}

//////////////////////// Main /////////////////////

let path_engine_source;

function get_source(repo, dest, after)
{
    log(`Downloading source code from ${repo} into ${dest}`);

    // Create dest folder if it doesnt exist
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    // This is a new local repo, so clone
    if (fs.readdirSync(dest).length === 0) {
        run(`git clone --recurse-submodules "${repo}" "${dest}"`, after);
    }
    else {
        run(`cd "${dest}" & git pull`, after);
    }
}

function make_source(premake_path, premake_target, after)
{
    log(`Making engine projects for ${premake_target} in ${path_engine_source}`);

    if (path_engine_source === undefined)
    {
        log(`ERROR no engine install found!`);
        after();
        return;
    }

    run(`cd ${path_engine_source} & ${premake_path} ${premake_target}`, after);
}

// update-engine-source
// create-engine-projects
// compile-engine-projects

// setup-game-files
// set-game-libs
// create-game-projects

// update-tools-source
// create-tools-projects
// compile-tools-projects

// reflect-file

const url_engine_git = "https://github.com/IainWinter/IwEngine";


ipcMain.on('download-engine-source', (event, path_engine_dest) => {
    path_engine_source = path_engine_dest;
    get_source(url_engine_git, path_engine_dest, () => window.webContents.send("finish-locking-op"));
});

ipcMain.on('make-engine-projects', (event, premake_config) =>
{
    path_premake = premake_config[0];
    config_premake_target= premake_config[1];

    log(config_premake_target);
    make_source(path_premake, config_premake_target, () => window.webContents.send("finish-locking-op"));
});