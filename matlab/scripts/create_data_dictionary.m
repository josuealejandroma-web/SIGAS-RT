function dictionaryPath = create_data_dictionary()
%CREATE_DATA_DICTIONARY Create/update documented SIGAS-RT design data.

proj = setup_project();
scriptFolder = fileparts(mfilename('fullpath'));
matlabRoot = fileparts(scriptFolder);
dictionaryPath = fullfile(matlabRoot, "data", "sigas_rt.sldd");

if isfile(dictionaryPath)
    dictionary = Simulink.data.dictionary.open(dictionaryPath);
else
    dictionary = Simulink.data.dictionary.create(dictionaryPath);
end
designData = getSection(dictionary, "Design Data");

definitions = {
    "General_SchemaVersion", uint16(2), "1", "Version of MATLAB simulation data schema", "REQUIREMENT: MATLAB migration prompt";
    "General_ZoneCount", uint8(3), "1", "Kitchen, Technical and Living zones", "REQUIREMENT: include/v2/types.h";
    "GasSensor_AdcMin", uint16(0), "1", "Minimum simulated 12-bit ADC code", "V1_COMPATIBILITY: ESP32 ADC abstraction";
    "GasSensor_AdcMax", uint16(4095), "1", "Maximum simulated 12-bit ADC code", "V1_COMPATIBILITY: ESP32 ADC abstraction";
    "GasSensor_WarningEnter", uint16(1400), "1", "Academic warning entry threshold; not calibrated ppm", "V1_COMPATIBILITY: include/config.h";
    "GasSensor_WarningExit", uint16(1000), "1", "Academic warning exit threshold; not calibrated ppm", "V1_COMPATIBILITY: include/config.h";
    "GasSensor_High", uint16(3000), "1", "Academic critical threshold; not calibrated ppm", "V1_COMPATIBILITY: include/config.h";
    "GasSensor_Severe", uint16(3900), "1", "V2 academic severe stimulus threshold", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "GasSensor_ResponseTau", 1.0, "s", "First-order MQ-2 response approximation", "SIMULATION_ASSUMPTION";
    "GasSensor_NoiseAmplitude", 8.0, "1", "Optional bounded ADC noise amplitude", "SIMULATION_ASSUMPTION";
    "Pressure_NormalSupply", 20.0, "mbar", "Nominal source/manifold gauge pressure for scenarios", "SIMULATION_ASSUMPTION: docs/v2/presiones_y_valvulas.md";
    "Pressure_NormalBranch", 19.0, "mbar", "Nominal branch gauge pressure for scenarios", "SIMULATION_ASSUMPTION: docs/v2/presiones_y_valvulas.md";
    "Pressure_Low", 12.0, "mbar", "Academic low pressure classifier threshold", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pressure_SupplyLow", 8.0, "mbar", "Academic supply-loss classifier threshold", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pressure_High", 30.0, "mbar", "Academic overpressure classifier threshold", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pressure_Max", 40.0, "mbar", "Maximum accepted simulated pressure reading", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pressure_Delta", 4.0, "mbar", "Minimum manifold-to-branch anomaly delta", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pressure_RapidDrop", 20.0, "mbar/s", "Rapid branch pressure drop classifier", "SIMULATION_ASSUMPTION: include/v2/config.h";
    "Pipe_TrunkLength", 8.0, "m", "Configurable academic trunk length", "SIMULATION_ASSUMPTION; Blender geometry is not a certified plan";
    "Pipe_KitchenLength", 3.0, "m", "Configurable kitchen branch length", "SIMULATION_ASSUMPTION";
    "Pipe_TechnicalLength", 4.0, "m", "Configurable technical branch length", "SIMULATION_ASSUMPTION";
    "Pipe_LivingLength", 4.0, "m", "Configurable Living branch length", "SIMULATION_ASSUMPTION";
    "Pipe_InnerDiameter", 0.015, "m", "Configurable common pipe inner diameter", "SIMULATION_ASSUMPTION";
    "Pipe_Roughness", 1.5e-5, "m", "Configurable equivalent roughness", "SIMULATION_ASSUMPTION";
    "Pipe_TerminalLoadArea", 1.0e-7, "m^2", "Equivalent terminal appliance load area for each branch", "SIMULATION_ASSUMPTION; tune only against documented plant targets";
    "Pipe_LeakAreaClosed", 0.0, "m^2", "No-leak restriction area command", "SIMULATION_ASSUMPTION";
    "Pipe_LeakAreaRupture", 4.0e-5, "m^2", "Living rupture scenario opening area", "SIMULATION_ASSUMPTION; produces a localized PL drop below 12 mbar while P1 remains above 12 mbar";
    "Valve_OpenCommand", true, "1", "Logical open valve command", "REQUIREMENT: single actuation layer";
    "Valve_ClosedCommand", false, "1", "Logical closed valve command", "REQUIREMENT: fail-safe actuation";
    "Timing_GasSample", 0.100, "s", "Gas acquisition period", "V1_COMPATIBILITY: include/config.h";
    "Timing_PressureSample", 0.050, "s", "Pressure acquisition period", "REQUIREMENT: docs/v2/tareas_freertos_v2.md";
    "Timing_Diagnostics", 0.500, "s", "Diagnostics activity period", "V1_COMPATIBILITY: include/config.h";
    "Timing_SensorTimeout", 0.350, "s", "Gas sensor freshness timeout", "V1_COMPATIBILITY: include/config.h";
    "Timing_PressureTimeout", 0.175, "s", "Pressure sensor freshness timeout", "REQUIREMENT: include/v2/config.h";
    "Timing_PostConfirmationDeadline", 0.500, "s", "Academic post-confirmation deadline", "REQUIREMENT: RT-03; not WCET/WCRT";
    "StateMachine_CriticalSamples", uint8(3), "1", "Consecutive high gas samples required", "V1_COMPATIBILITY: include/config.h";
    "StateMachine_PressureSamples", uint8(3), "1", "Consecutive pressure anomaly samples required", "REQUIREMENT: include/v2/config.h";
    "StateMachine_RearmSamples", uint8(3), "1", "Consecutive safe samples required before reset", "V1_COMPATIBILITY: include/config.h";
    "StateMachine_ResetDebounce", uint8(2), "1", "Manual reset debounce samples", "V1_COMPATIBILITY: include/config.h";
    "Telemetry_SchemaVersion", uint16(2), "1", "Versioned MATLAB_SIM telemetry schema", "REQUIREMENT: MATLAB migration prompt";
    "Test_DefaultStopTime", 12.0, "s", "Finite stop time for single scenarios", "SIMULATION_ASSUMPTION";
    "Test_FullDemoStopTime", 55.0, "s", "Finite stop time for V2 full demonstration", "SIMULATION_ASSUMPTION";
    };

for row = 1:size(definitions, 1)
    name = definitions{row, 1};
    parameter = Simulink.Parameter(definitions{row, 2});
    parameter.Unit = definitions{row, 3};
    parameter.Description = sprintf('%s. Origin: %s.', definitions{row, 4}, definitions{row, 5});
    try
        entry = getEntry(designData, name);
        setValue(entry, parameter);
    catch
        addEntry(designData, name, parameter);
    end
end

saveChanges(dictionary);
close(dictionary);
addFile(proj, dictionaryPath);
addPath(proj, fullfile(matlabRoot, "data"));
fprintf('SIGAS-RT data dictionary ready: %s\n', dictionaryPath);
end
