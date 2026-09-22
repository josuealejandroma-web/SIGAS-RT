function [out, ds] = stream_simulation_to_web(scenarioName, stopTime, playbackRate)
%STREAM_SIMULATION_TO_WEB Run a scenario and stream schema-v2 JSON locally.
%   This visualization-only downlink never sends actuator commands.

arguments
    scenarioName (1,1) string = "V2_NORMAL"
    stopTime (1,1) double {mustBePositive} = 5
    playbackRate (1,1) double {mustBePositive} = 1
end

[out, ds] = run_scenario(scenarioName, stopTime);
telemetry = out.yout{1}.Values;
data = squeeze(telemetry.Data);
if size(data, 2) ~= 25 && size(data, 1) == 25
    data = data.';
end
if size(data, 2) ~= 25
    error("SIGAS:TelemetryWidth", ...
        "Expected 25 telemetry fields, received %d.", size(data, 2));
end

validCommand = ds{3};
udpSender = javaObject("java.net.DatagramSocket");
udpAddress = javaMethod("getByName", "java.net.InetAddress", "127.0.0.1");
cleanupSender = onCleanup(@()udpSender.close());
sequence = uint32(0);

for index = 1:size(data, 1)
    sequence = sequence + 1;
    row = double(data(index, :));
    simTime = telemetry.Time(index);
    valid = logical(interp1(validCommand.Time, double(validCommand.Data), ...
        simTime, "previous", "extrap"));
    frame = rowToFrame(row, sequence, simTime, valid);
    payload = uint8(unicode2native(jsonencode(frame), "UTF-8"));
    packet = javaObject("java.net.DatagramPacket", int8(payload), ...
        numel(payload), udpAddress, 45810);
    udpSender.send(packet);

    if index < size(data, 1)
        delay = (telemetry.Time(index + 1) - simTime) / playbackRate;
        pause(max(0, delay));
    end
end

fprintf("WEB_STREAM_COMPLETE scenario=%s frames=%u stopTime=%.3f\n", ...
    scenarioName, sequence, stopTime);
end

function frame = rowToFrame(row, sequence, simTime, valid)
frame = struct();
frame.schemaVersion = 2;
frame.source = "MATLAB_SIM";
frame.sequence = double(sequence);
frame.simTime = simTime;
frame.timestamp = posixtime(datetime("now", "TimeZone", "UTC")) * 1000;
frame.systemState = stateName(row(5));
frame.eventType = eventName(row(6));
frame.affectedZoneMask = row(8);

frame.gas = struct( ...
    "Z1", gasZone(row(9), valid(1)), ...
    "Z2", gasZone(row(10), valid(2)), ...
    "Z3", gasZone(row(11), valid(3)));
frame.pressure = struct( ...
    "P0", row(12), "P1", row(13), "PK", row(14), ...
    "PL", row(16), "PT", row(15));
frame.flow = struct("main", row(17), "living", row(18));
frame.valves = struct( ...
    "VM", valveName(row(19)), "VK", valveName(row(20)), ...
    "VL", valveName(row(22)), "VT", valveName(row(21)));
frame.buzzer = logical(row(23));
frame.greenLed = logical(row(24));
frame.redLed = logical(row(25));
end

function zone = gasZone(adc, valid)
if ~valid
    level = "FAULT";
elseif adc >= 3000
    level = "CRITICAL";
elseif adc >= 1400
    level = "WARNING";
else
    level = "NORMAL";
end
zone = struct("adc", adc, "level", level, "valid", valid);
end

function name = stateName(code)
names = ["STARTUP", "NORMAL", "WARNING", "CRITICAL", "SAFE_LATCHED", "FAULT"];
name = names(min(max(round(code) + 1, 1), numel(names)));
end

function name = eventName(code)
names = ["NONE", "GAS_LEAK", "PRESSURE_ANOMALY", "PIPE_RUPTURE", ...
    "SENSOR_FAULT", "MULTI_ZONE", "SUPPLY_PRESSURE_LOSS"];
name = names(min(max(round(code) + 1, 1), numel(names)));
end

function name = valveName(isOpen)
if logical(isOpen)
    name = "OPEN";
else
    name = "CLOSED";
end
end
