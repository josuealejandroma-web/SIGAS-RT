function proj = setup_project()
%SETUP_PROJECT Create or open the idempotent SIGAS-RT MATLAB Project.

scriptFolder = fileparts(mfilename('fullpath'));
matlabRoot = fileparts(scriptFolder);

folders = [
    "models"
    "models/plant"
    "models/controller"
    "models/sensors"
    "models/telemetry"
    "data"
    "requirements"
    "scenarios"
    "tests"
    "scripts"
    "results/parity_v1"
    "results/v2"
    "reports"
    "work"
    ];

for folder = folders'
    absoluteFolder = fullfile(matlabRoot, folder);
    if ~isfolder(absoluteFolder)
        mkdir(absoluteFolder);
    end
end

activeProject = [];
try
    activeProject = currentProject;
catch
    % No project is currently open.
end

if ~isempty(activeProject) && ~strcmpi(activeProject.RootFolder, matlabRoot)
    close(activeProject);
    activeProject = [];
end

if isempty(activeProject)
    try
        proj = openProject(matlabRoot);
    catch
        proj = matlab.project.createProject("Folder", matlabRoot, "Name", "SIGAS_RT");
    end
else
    proj = activeProject;
end

for folder = folders(1:10)'
    addPath(proj, fullfile(matlabRoot, char(folder)));
end

trackedFolders = ["models", "data", "requirements", "scenarios", "tests", "scripts"];
for folder = trackedFolders
    addFolderIncludingChildFiles(proj, fullfile(matlabRoot, char(folder)));
end

addStartupFile(proj, fullfile(matlabRoot, "startup.m"));
addShutdownFile(proj, fullfile(matlabRoot, "shutdown.m"));

shortcutFiles = [
    "scripts/open_system_model.m"
    "scripts/run_all_tests.m"
    "scripts/run_full_demo.m"
    ];
for shortcutFile = shortcutFiles'
    absoluteShortcut = fullfile(matlabRoot, shortcutFile);
    if isfile(absoluteShortcut)
        try
            addShortcut(proj, absoluteShortcut);
        catch exception
            if ~contains(exception.message, "already", "IgnoreCase", true)
                rethrow(exception);
            end
        end
    end
end

proj.SimulinkCacheFolder = fullfile(matlabRoot, "work");
proj.SimulinkCodeGenFolder = fullfile(matlabRoot, "work");
proj.DependencyCacheFile = fullfile(matlabRoot, "work", "dependency_cache.graphml");

updateDependencies(proj);
fprintf('SIGAS-RT project configured at %s\n', proj.RootFolder);
end
