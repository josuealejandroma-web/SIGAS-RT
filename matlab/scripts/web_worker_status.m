function web_worker_status(folder, phase, scenario, runId, message)
% Session status is separate from telemetry freshness.
arguments
    folder (1,1) string
    phase (1,1) string
    scenario (1,1) string = ""
    runId (1,1) string = ""
    message (1,1) string = ""
end
status = struct("connected", true, "phase", phase, "scenario", scenario, ...
    "runId", runId, "message", message);
path = fullfile(folder, "status.json");
fid = fopen(path + ".tmp", 'w', 'n', 'UTF-8');
assert(fid >= 0, 'Cannot write worker status.');
fprintf(fid, '%s', jsonencode(status));
fclose(fid);
movefile(path + ".tmp", path, 'f');
end
