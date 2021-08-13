const { app, ipcMain, shell, BrowserWindow } = require('electron');
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
            preload: p('src/preload.js')
        }
    });

    window.loadFile(p('src/index.html'));
    window.setMenu(null);

    window.webContents.openDevTools();
});

function p(x) {
    return path.resolve(x);
}

function log(message) {
    window.webContents.send("log", `[NODE] ${message}`);
}

let runId = 0;

function run(command, after = undefined) {
    const { spawn } = require("child_process");

    
    let id = ++runId;
    log(`cmd (${id}): ${command}`);

    let proc = spawn(command, [], {shell: true});

    proc.stdout.on('data', (buf) => 
    {
        log(`(${id}) ${buf.toString()}`)
    });

    proc.stderr.on('data', (buf) => 
    {
        log(`(${id}) ${buf.toString()}`)
    });
    
    proc.on('close', () => 
    { 
        log(`(${id}) done`); 
        if (after !== undefined) {
            after();
        } 
    });
}

//////////////////////// Main /////////////////////

let path_engine_source;
let path_premake;
let path_msbuild;
let config_premake_target;

const url_fmod_zip = "https://winter.dev/engine/fmod_libs.zip";
const url_engine_git = "https://github.com/IainWinter/IwEngine";

// these should be much stronger, right now they basically just test for if you have hit the buttons
function validate_engine_install() 
{
    let hasError = path_engine_source === undefined;
    
    if (hasError)
    {
        log(`ERROR no engine install found!`);
    }

    return hasError;
}

// see above
function validate_build_tool_install()
{
    let hasError = path_premake === undefined || config_premake_target === undefined;
    
    if (hasError) { 
        log("ERROR no build tools found!");
    }

    return hasError;
}

function get_source(repo, dest, after)
{
    log(`Downloading source code from ${repo} into ${dest}`);

    // Create dest folder if it doesnt exist, /////// this should test for write access
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
    if (validate_engine_install()) return after();

    log(`Making engine projects for ${premake_target} in ${path_engine_source}`);

//"cmake -S " .. assimpdir  .. " -B " .. assimpdir .. blddir

    let assimp_source = path_engine_source + "/IwEngine/extern/assimp/";
    let assimp_build  = path_engine_source + "/IwEngine/extern/assimp/build/";


    // run cmake manually instead of thouse the premake script this allows tihs to work but might be
    // annoying because someone cant just run the premake script, but fmod makes it so they cant do
    // that anyway...

    run(`cmake -S "${assimp_source}" -B "${assimp_build}"`);
    run(`cd "${path_engine_source}" & "${premake_path}" ${premake_target}`, after);
}

function build_all(after) 
{
    if (   validate_engine_install() 
        || validate_build_tool_install()) 
    {
        return after();
    }

    log(`Compiling engine source, this will take several minuets...`);

    let assimp_proj = path_engine_source + "/IwEngine/extern/assimp/build/ALL_BUILD.vcxproj"
    let engine_proj = path_engine_source + "/IwEngine/build/wEngine.sln"

    download_fmod_api();

    let build = (name, _after) => {
        run(`"${path_msbuild}" "${name}" /property:Configuration=Debug /property:Platform=x64`)
        run(`"${path_msbuild}" "${name}" /property:Configuration=Release /property:Platform=x64`, _after)
    }

    // build assimp THEN then engine

    build(assimp_proj, () => {
        build(engine_proj, after);
    });
}

function download_fmod_api() 
{
    if (validate_engine_install()) return;

    let fmod_path = path_engine_source + "/IwEngine/extern/fmod"

    log(`Extracting FMod API from ${url_fmod_zip} to ${fmod_path}`)

    
    const request = require('request');
    const zip = require("adm-zip");
    
    request.get({url: url_fmod_zip, encoding: null}, (err, res, body) => {
        new zip(body).extractAllTo(fmod_path);
    });
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

ipcMain.on('download-engine-source', (event, path_engine_dest) => 
{
    path_engine_source = p(path_engine_dest);

    get_source(url_engine_git, path_engine_source, () => window.webContents.send("finish-locking-op"));
});

ipcMain.on('make-engine-projects', (event, build_config) =>
{
    path_premake = p(build_config[0]);
    path_msbuild = p(build_config[1]);
    config_premake_target = build_config[2];

    make_source(path_premake, config_premake_target, () => window.webContents.send("finish-locking-op"));
});

ipcMain.on('compile-engine-projects', (event) =>
{
    build_all(() => window.webContents.send("finish-locking-op"));
});

ipcMain.on('open-link', (event, link) => {
    log(`Opening ${link} in browser...`);
    shell.openExternal(link);
});