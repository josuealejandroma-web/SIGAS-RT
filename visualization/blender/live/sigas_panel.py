"""Native Sidebar panel; operators only request catalog scenarios."""

import bpy
from bpy.props import StringProperty

BUTTONS = (
    ("RUN_NORMAL", "Normal"), ("RUN_SAFE", "Seguro"),
    ("RUN_ZONE1_LEAK", "Fuga Cocina"), ("RUN_ZONE2_LEAK", "Fuga Calefon"),
    ("RUN_BOTH_LEAK", "Fuga Doble"), ("RUN_FALSE_POSITIVE", "Pico Aislado"),
    ("RUN_SENSOR_TIMEOUT", "Falla Sensor"), ("RUN_INITIAL_TIMEOUT", "Timeout Inicial"),
    ("FULL_DEMO", "Full Demo"),
)


def runtime():
    from . import get_runtime
    return get_runtime()


class SIGAS_OT_live(bpy.types.Operator):
    bl_idname = "sigas.live"
    bl_label = "Iniciar LIVE"
    bl_description = "Recibir telemetria del bridge local"

    def execute(self, context):
        try:
            runtime().start()
        except (OSError, ValueError, RuntimeError) as exc:
            self.report({'ERROR'}, str(exc))
            return {'CANCELLED'}
        return {'FINISHED'}


class SIGAS_OT_stop(bpy.types.Operator):
    bl_idname = "sigas.stop"
    bl_label = "Detener LIVE"
    bl_description = "Cerrar receptor y restaurar la presentacion original"

    def execute(self, context):
        runtime().stop()
        return {'FINISHED'}


class SIGAS_OT_scenario(bpy.types.Operator):
    bl_idname = "sigas.scenario"
    bl_label = "Ejecutar escenario"
    bl_description = "Solicitar al bridge un escenario permitido de Wokwi"
    command: StringProperty()

    def execute(self, context):
        try:
            runtime().command(self.command)
        except (OSError, ValueError, RuntimeError) as exc:
            self.report({'ERROR'}, str(exc))
            return {'CANCELLED'}
        return {'FINISHED'}


class SIGAS_OT_replay(bpy.types.Operator):
    bl_idname = "sigas.replay"
    bl_label = "Recorded Replay"
    bl_description = "Reproducir la captura historica local desde el inicio"

    def execute(self, context):
        try:
            runtime().stop()
            runtime().start(replay=True)
        except (OSError, ValueError, RuntimeError) as exc:
            self.report({'ERROR'}, str(exc))
            return {'CANCELLED'}
        return {'FINISHED'}


class SIGAS_OT_pause(bpy.types.Operator):
    bl_idname = "sigas.replay_pause"
    bl_label = "Pausar / reanudar replay"

    def execute(self, context):
        runtime().pause_replay()
        return {'FINISHED'}


class SIGAS_PT_live(bpy.types.Panel):
    bl_label = "SIGAS-RT LIVE"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "SIGAS-RT"

    def draw(self, context):
        rt = runtime()
        layout = self.layout
        source = rt.source if rt.session.last_valid is not None or rt.source == "RECORDED REPLAY" else "SIN DATOS"
        layout.label(text=source, icon='RADIOBUT_ON' if source == "LIVE WOKWI" else 'INFO')
        conn = rt.connection()
        row = layout.row()
        row.alert = conn != "LIVE" and source != "RECORDED REPLAY"
        row.label(text="Conexion: " + conn)
        if rt.session.state and conn != "LIVE" and source != "RECORDED REPLAY":
            layout.label(text="ULTIMO ESTADO / DATOS ANTIGUOS", icon='ERROR')
        row = layout.row(align=True)
        row.operator("sigas.live", text="Iniciar LIVE", icon='PLAY')
        row.operator("sigas.stop", text="Detener", icon='PAUSE')
        layout.label(text="Receptor: " + ("ACTIVO" if rt.receiver.running else "DETENIDO"))
        frame = rt.session.state
        layout.separator()
        layout.label(text="Estado:")
        layout.label(text=frame["state"] if frame else "SIN DATOS")
        for zone in (1, 2):
            text = f"Zona {zone}: "
            text += f"ADC {frame[f'zone{zone}_adc']} / {frame[f'zone{zone}_level']}" if frame else "N/A"
            layout.label(text=text)
        layout.label(text="Valvula: " + (frame["valve"] if frame else "N/A"))
        for key, label in (("buzzer", "Buzzer"), ("green_led", "LED verde"), ("red_led", "LED rojo")):
            layout.label(text=label + ": " + (("ON" if frame[key] else "OFF") if frame else "N/A"))
        timing = rt.session.timing
        layout.separator()
        layout.label(text="RT-03: " + (timing["result"] if timing else "N/A"))
        if timing:
            layout.label(text=f"{timing['response_us']} us / {timing['deadline_us']} us")
            layout.label(text=f"Ultimo evento SEQ {timing['seq']}")
        layout.label(text="Bridge:")
        # Separate lines keep a narrow native sidebar readable.
        import textwrap
        for line in textwrap.wrap(rt.status, width=max(22, int(context.region.width / 8))):
            layout.label(text=line)
        layout.label(text=f"Paquetes: {rt.session.accepted} / invalidos: {rt.session.rejected}")
        layout.separator()
        grid = layout.grid_flow(columns=2, align=True)
        for command, label in BUTTONS:
            if command in rt.catalog:
                grid.operator("sigas.scenario", text=label).command = command
        layout.separator()
        layout.operator("sigas.replay", text="Recorded Replay", icon='FILE_REFRESH')
        if source == "RECORDED REPLAY":
            layout.operator("sigas.replay_pause", text="Reanudar" if rt.replay_paused else "Pausar", icon='PAUSE')


CLASSES = (SIGAS_OT_live, SIGAS_OT_stop, SIGAS_OT_scenario, SIGAS_OT_replay, SIGAS_OT_pause, SIGAS_PT_live)
