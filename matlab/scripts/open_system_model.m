function open_system_model()
%OPEN_SYSTEM_MODEL Open the visible SIGAS-RT top-level Simulink model.

proj = setup_project();
modelPath = fullfile(proj.RootFolder, "models", "SIGAS_RT_System.slx");
if ~isfile(modelPath)
    error("SIGAS:ModelMissing", "Model has not been generated yet: %s", modelPath);
end
open_system(modelPath);
end
