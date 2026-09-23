function web_simulation_worker(folder)
% Persistent local MATLAB session. Accepts scenario stimuli, never valve commands.
arguments
    folder (1,1) string
end
setup_project();
load_system('SIGAS_RT_System');
lastRun = "";
allowed = ["V2_NORMAL", "V2_GAS_LEAK_KITCHEN", "V2_GAS_LEAK_TECHNICAL", ...
    "V2_GAS_LEAK_LIVING", "V2_PIPE_RUPTURE_LIVING", "V2_PRESSURE_DROP_NO_GAS", ...
    "V2_FALSE_PRESSURE_SPIKE", "V2_PRESSURE_SENSOR_FAILURE", ...
    "V2_GAS_SENSOR_FAILURE_Z3", "V2_MULTI_ZONE_LEAK", "V2_FULL_DEMO"];
web_worker_status(folder, "idle");
while true
    pause(0.3);
    try
        request = jsondecode(fileread(fullfile(folder, "command.json")));
    catch
        continue;
    end
    if strcmp(request.action, 'stop'), break; end
    if ~strcmp(request.action, 'run') || string(request.runId) == lastRun, continue; end
    lastRun = string(request.runId);
    name = string(request.scenario);
    try
        assert(any(name == allowed), 'Scenario is not allowed.');
        assert(request.stopTime > 0 && request.stopTime <= 60, 'Invalid duration.');
        assert(request.playbackRate >= 0.1 && request.playbackRate <= 4, 'Invalid playback rate.');
        web_worker_status(folder, "computing", name, lastRun);
        stream_simulation_to_web(name, request.stopTime, request.playbackRate, false, lastRun, folder, request.udpPort);
        web_worker_status(folder, "completed", name, lastRun);
    catch exception
        web_worker_status(folder, "error", name, lastRun, string(exception.message));
        fprintf(2, '%s\n', getReport(exception));
    end
end
end
