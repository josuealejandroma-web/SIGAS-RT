function [out, ds] = run_scenario(scenarioName, stopTime)
%RUN_SCENARIO Run a SIGAS-RT scenario with non-destructive overrides.

arguments
    scenarioName (1,1) string = "V2_NORMAL"
    stopTime (1,1) double {mustBePositive} = 5
end

mdl = "SIGAS_RT_System";
ds = build_scenario_inputs(scenarioName, stopTime);

in = Simulink.SimulationInput(mdl);
in = in.setExternalInput(ds);
in = in.setModelParameter( ...
    "StopTime", string(stopTime), ...
    "SaveTime", "on", ...
    "TimeSaveName", "tout", ...
    "SaveOutput", "on", ...
    "OutputSaveName", "yout", ...
    "ReturnWorkspaceOutputs", "on");

out = sim(in);
end
