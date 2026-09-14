"""Interactive observation of one manually requested FULL_DEMO, no synthetic input.

Run with launcher.py --e2e, then click Full Demo once. With --auto-demo the same
panel operator is invoked once and Blender closes after evidence and cleanup.
Evidence goes to ignored .pio/blender-live only, never the temporal campaign.
"""

import json
import math
from pathlib import Path
import sys
import threading
import time

import bpy

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))
import visualization.blender.live as live

live.unregister()
live.register()
rt = live.get_runtime()
rt.start()
started = time.monotonic()
seen = set()
states = []
valves = set()
timing = []
connections = set()
visual_checks = 0
valve_checks = set()
finished = False
report_path = REPO / '.pio/blender-live/live_e2e_report.json'
auto_demo = '--auto-demo' in sys.argv
ticks = 0
requested = False
screenshots = set()
capture_errors = []
report = None
final_views = [('panel', 109), ('valve', 217), ('kitchen', 145), ('technical', 181)]
final_index = 0


def capture(label):
    if label in screenshots:
        return
    report_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        bpy.ops.screen.screenshot(filepath=str(report_path.parent / (label + '.png')))
        screenshots.add(label)
    except RuntimeError as exc:
        capture_errors.append(str(exc))


def save_report():
    report['screenshots'] = sorted(screenshots)
    report['capture_errors'] = capture_errors
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')


def finish():
    global final_index
    if final_index < len(final_views):
        if final_index:
            capture('final_' + final_views[final_index - 1][0])
        bpy.context.scene.frame_set(final_views[final_index][1])
        final_index += 1
        return 2.0
    capture('final_' + final_views[-1][0])
    worker = rt.receiver.worker
    live.unregister()
    report['cleanup'] = not worker.is_alive() and rt.receiver.socket is None and not bpy.app.timers.is_registered(rt.tick_callback)
    report['passed'] = report['passed'] and report['cleanup'] and not capture_errors
    save_report()
    print('BLENDER_LIVE_E2E: ' + ('PASS' if report['passed'] else 'FAIL'), flush=True)
    bpy.ops.wm.quit_blender()
    return None


def observe():
    global visual_checks, finished, ticks, requested, report
    if finished:
        return finish()
    ticks += 1
    now = time.monotonic()
    if ticks == 10:
        for area in bpy.context.screen.areas:
            if area.type == 'VIEW_3D':
                for region in area.regions:
                    if region.type == 'UI':
                        region.active_panel_category = 'SIGAS-RT'
        bpy.context.scene.frame_set(109)
    if auto_demo and ticks == 30 and not requested:
        capture('ready')
        requested = True
        assert bpy.ops.sigas.scenario(command='FULL_DEMO') == {'FINISHED'}
        print('BLENDER_LIVE_E2E: FULL_DEMO operator requested once', flush=True)
    connections.add(rt.connection())
    for frame in rt.history:
        key = json.dumps(frame, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        if frame['type'] == 'state':
            states.append(frame)
            valves.add(frame['valve'])
        else:
            timing.append(frame)
    frame = rt.session.state
    if frame is not None and rt.controller is not None:
        for zone in (1, 2):
            obj = bpy.data.objects[f'SIGAS_MQ2_Z{zone}']
            assert obj.active_material.name == 'SIGAS_LIVE_Sensor_' + frame[f'zone{zone}_level'].title()
            assert bpy.data.objects[f'SIGAS_LeakPoint_Z{zone}'].hide_get() == (frame[f'zone{zone}_level'] != 'HIGH')
        assert bpy.data.objects['SIGAS_LedGreen'].active_material.name.endswith('Green_On' if frame['green_led'] else 'Green_Off')
        assert bpy.data.objects['SIGAS_LedRed'].active_material.name.endswith('Red_On' if frame['red_led'] else 'Red_Off')
        assert bpy.data.objects['SIGAS_Buzzer'].active_material.name.endswith('Buzzer_On' if frame['buzzer'] else 'Buzzer_Off')
        if now - rt.controller.started_at >= 0.4:
            handle = bpy.data.objects['SIGAS_AutoValve_Handle']
            target = math.radians(handle[f"state_{frame['valve'].lower()}_degrees_y"])
            assert math.isclose(handle.rotation_euler.y, target, abs_tol=0.001)
            valve_checks.add(frame['valve'])
        visual_checks += 1
        if rt.connection() == 'LIVE':
            capture(frame['state'])
    # Keep the final received state visible for inspection. Close Blender manually.
    final_state = frame and frame['state'] == 'SYSTEM_SAFE_LATCHED' and frame['zone1_level'] == frame['zone2_level'] == 'HIGH'
    complete = bool(final_state) and rt.connection() == 'DISCONNECTED'
    if complete or now - started > 600:
        names = [frame['state'] for frame in states]
        rearmed = any(name == 'SYSTEM_NORMAL' for name in names[names.index('SYSTEM_SAFE_LATCHED') + 1:]) if 'SYSTEM_SAFE_LATCHED' in names else False
        checks = {
            'normal_warning_latched': {'SYSTEM_NORMAL', 'SYSTEM_WARNING', 'SYSTEM_SAFE_LATCHED'} <= set(names),
            'rearmed': rearmed,
            'open_closed': valves == {'OPEN', 'CLOSED'},
            'zone1_high': any(f['zone1_level'] == 'HIGH' for f in states),
            'zone2_high': any(f['zone2_level'] == 'HIGH' for f in states),
            'both_high': any(f['zone1_level'] == f['zone2_level'] == 'HIGH' for f in states),
            'timing_received': bool(timing),
            'freshness': {'LIVE', 'STALE', 'DISCONNECTED'} <= connections,
            'visual_fields': visual_checks > 0,
            'visual_valve_open_closed': valve_checks == {'OPEN', 'CLOSED'},
            'single_receiver': sum(t.name == 'SIGAS-Blender-UDP' for t in threading.enumerate()) == 1,
            'master_tour': bpy.context.scene.camera.name == 'SIGAS_Camera_Interior' and bpy.context.scene.frame_end == 529 and bpy.context.scene.render.fps == 24 and len(bpy.context.scene.timeline_markers) == 15,
        }
        report = {'source': 'LIVE WOKWI', 'scope': 'visualization integration only',
                  'checks': checks, 'passed': all(checks.values()),
                  'received_states': names, 'state_packets': len(states),
                  'timing_packets': len(timing), 'visual_checks': visual_checks,
                  'critical_state_received': 'SYSTEM_CRITICAL' in names,
                  'critical_note': 'Transient SYSTEM_CRITICAL is not guaranteed in periodic state telemetry',
                  'timing': timing,
                  'elapsed_seconds': round(now - started, 2),
                  'ports': [45701, 45702]}
        capture('disconnected')
        save_report()
        finished = True
        return 0.1 if auto_demo else None
    return 0.1


def guarded_observe():
    global report
    try:
        return observe()
    except Exception as exc:
        import traceback
        traceback.print_exc()
        report = {'passed': False, 'error': str(exc), 'source': 'LIVE WOKWI'}
        live.unregister()
        save_report()
        if auto_demo:
            bpy.ops.wm.quit_blender()
        return None


bpy.app.timers.register(guarded_observe, first_interval=0.1)
print('BLENDER_LIVE_E2E: ' + ('automatic single operator test' if auto_demo else 'waiting for one Full Demo button click'), flush=True)
