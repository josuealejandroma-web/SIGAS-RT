function ds = build_scenario_inputs(scenarioName, stopTime)
%BUILD_SCENARIO_INPUTS Create external inputs for a SIGAS-RT scenario.
%   The generated signals are simulation stimuli, not measured data.

arguments
    scenarioName (1,1) string = "V2_NORMAL"
    stopTime (1,1) double {mustBePositive} = 5
end

mdl = "SIGAS_RT_System";
ds = createInputDataset(mdl);

dt = 0.05;
t = (0:dt:stopTime)';
n = numel(t);

gas = zeros(n, 3);
noise = zeros(n, 3);
sensorValid = true(n, 3);
manualReset = false(n, 1);
scenarioFault = false(n, 1);
livingLeakArea = zeros(n, 1);
scenarioId = ones(n, 1);

gasStart = t >= 1.0;
leakStart = t >= 1.0;
ruptureArea = 4.0e-5; % Mirrors Pipe_LeakAreaRupture (SIMULATION_ASSUMPTION).

switch upper(scenarioName)
    case "V2_NORMAL"
        scenarioId(:) = 1;
    case "V2_GAS_LEAK_KITCHEN"
        gas(gasStart, 1) = 1;
        scenarioId(:) = 2;
    case "V2_GAS_LEAK_TECHNICAL"
        gas(gasStart, 2) = 1;
        scenarioId(:) = 3;
    case "V2_GAS_LEAK_LIVING"
        gas(gasStart, 3) = 1;
        scenarioId(:) = 4;
    case "V2_PIPE_RUPTURE_LIVING"
        livingLeakArea(t >= 2.5) = ruptureArea;
        gas(t >= 1.5, 3) = 1;
        scenarioId(:) = 5;
    case "V2_PRESSURE_DROP_NO_GAS"
        livingLeakArea(leakStart) = ruptureArea;
        scenarioId(:) = 6;
    case "V2_PRESSURE_SENSOR_FAILURE"
        scenarioFault(t >= 1.0) = true;
        scenarioId(:) = 7;
    case "V2_GAS_SENSOR_FAILURE_Z3"
        sensorValid(t >= 1.0, 3) = false;
        scenarioId(:) = 8;
    case "V2_MULTI_ZONE_LEAK"
        gas(gasStart, [1 3]) = 1;
        scenarioId(:) = 9;
    case "V2_FALSE_PRESSURE_SPIKE"
        livingLeakArea(t >= 1.0 & t < 1.05) = ruptureArea;
        scenarioId(:) = 11;
    case "V2_FULL_DEMO"
        gas(t >= 3.0 & t < 7.0, 1) = 1;
        manualReset(t >= 9.0 & t < 9.5) = true;
        livingLeakArea(t >= 13.0 & t < 18.0) = ruptureArea;
        gas(t >= 14.0 & t < 18.0, 3) = 1;
        manualReset(t >= 20.0 & t < 20.5) = true;
        sensorValid(t >= 24.0 & t < 27.0, 2) = false;
        manualReset(t >= 29.0 & t < 29.5) = true;
        gas(t >= 33.0, [1 3]) = 1;
        scenarioId(:) = 12;
    case "V2_MASTER_PRESSURE_LOSS"
        error("SIGAS:ScenarioNotRepresentable", ...
            ["V2_MASTER_PRESSURE_LOSS requires a controllable physical " ...
             "supply-pressure input; it is intentionally not emulated " ...
             "with Scenario_Fault."]);
    otherwise
        error("SIGAS:UnknownScenario", ...
            "Unknown SIGAS-RT scenario: %s", scenarioName);
end

values = {
    gas                 % Gas_Concentration_Proxy
    noise               % Gas_Noise_ADC
    sensorValid         % Sensor_Valid_Command
    manualReset         % Manual_Reset
    scenarioFault       % Scenario_Fault
    livingLeakArea      % Living_Leak_Area
    scenarioId          % Scenario_ID
    };

for k = 1:numel(values)
    origEl = ds{k};
    if islogical(origEl.Data)
        signalData = logical(values{k});
    else
        signalData = cast(values{k}, "like", origEl.Data);
    end

    ts = timeseries(signalData, t, "Name", origEl.Name);
    ts.DataInfo.Interpolation = origEl.DataInfo.Interpolation;
    ts.DataInfo.Units = origEl.DataInfo.Units;
    ds{k} = ts;
end
end
