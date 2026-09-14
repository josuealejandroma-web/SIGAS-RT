"""Blender background integration checks; all input is local test data."""

import json
import math
from pathlib import Path
import socket
import sys
import threading
import time

import bpy

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))
import visualization.blender.live as live
from visualization.blender.live.runtime import LiveRuntime
from visualization.blender.live.tests.test_transport import state_frame, timing_frame
from visualization.blender.live.visual_controller import REQUIRED_OBJECTS


def run():
    scene = bpy.context.scene
    baseline = (set(bpy.data.objects.keys()), set(bpy.data.materials.keys()), scene.camera,
                scene.frame_start, scene.frame_end, scene.render.fps,
                [(m.name, m.frame) for m in scene.timeline_markers])
    originals = {name: [(s.link, s.material) for s in bpy.data.objects[name].material_slots] for name in REQUIRED_OBJECTS}
    handle = bpy.data.objects['SIGAS_AutoValve_Handle']
    action = handle.animation_data.action
    slot = handle.animation_data.action_slot
    camera_action = scene.camera.animation_data.action
    live.register()
    live.register()
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as commands:
        commands.bind(('127.0.0.1', 0))
        commands.settimeout(1)
        now = [time.monotonic()]
        rt = LiveRuntime(port=0, command_port=commands.getsockname()[1], clock=lambda: now[0])
        live._runtime = rt
        try:
            assert bpy.ops.sigas.live() == {'FINISHED'}
            worker = rt.receiver.worker
            assert bpy.ops.sigas.live() == {'FINISHED'}
            assert rt.receiver.worker is worker
            assert bpy.app.timers.is_registered(rt.tick_callback)
            assert handle.animation_data.action is None
            assert bpy.ops.sigas.scenario(command='FULL_DEMO') == {'FINISHED'}
            assert commands.recv(256) == b'FULL_DEMO'
            print('BLENDER_LIVE_PANEL_COMMAND: PASS')

            def inject(frame):
                count = rt.session.accepted
                with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
                    peer.sendto(json.dumps(frame).encode(), ('127.0.0.1', rt.receiver.port))
                deadline = time.monotonic() + 2
                while rt.session.accepted == count and time.monotonic() < deadline:
                    time.sleep(0.01)
                    rt.tick()
                assert rt.session.accepted == count + 1

            for state in ('SYSTEM_STARTUP', 'SYSTEM_NORMAL', 'SYSTEM_WARNING', 'SYSTEM_CRITICAL',
                          'SYSTEM_SAFE_LATCHED', 'SYSTEM_FAULT'):
                # Deliberately contradictory actuators prove they follow received fields.
                frame = state_frame(state=state, valve='CLOSED', buzzer=True, green_led=False, red_led=True,
                                    zone1_level='HIGH', zone2_level='WARNING')
                inject(frame)
                assert rt.session.state['state'] == state
                assert rt.connection() == 'LIVE'
                now[0] += 0.31
                rt.tick()
                assert abs(handle.rotation_euler.y - math.pi / 2) < 1e-5
                for name, suffix in (('SIGAS_MQ2_Z1', 'Sensor_High'), ('SIGAS_MQ2_Z2', 'Sensor_Warning'),
                                     ('SIGAS_LedGreen', 'Green_Off'), ('SIGAS_LedRed', 'Red_On'),
                                     ('SIGAS_Buzzer', 'Buzzer_On')):
                    assert bpy.data.objects[name].active_material.name == 'SIGAS_LIVE_' + suffix
                assert not bpy.data.objects['SIGAS_LeakPoint_Z1'].hide_get()
                assert bpy.data.objects['SIGAS_LeakPoint_Z2'].hide_get()
            inject(state_frame(zone1_level='NORMAL', zone2_level='HIGH', state='SYSTEM_FAULT'))
            now[0] += 0.31
            rt.tick()
            assert abs(handle.rotation_euler.y) < 1e-5
            assert bpy.data.objects['SIGAS_LeakPoint_Z1'].hide_get()
            assert not bpy.data.objects['SIGAS_LeakPoint_Z2'].hide_get()
            assert bpy.data.objects['SIGAS_LedGreen'].active_material.name.endswith('Green_On')
            assert bpy.data.objects['SIGAS_LedRed'].active_material.name.endswith('Red_Off')
            assert bpy.data.objects['SIGAS_Buzzer'].active_material.name.endswith('Buzzer_Off')
            inject(timing_frame())
            assert rt.session.timing['result'] == 'PASS'
            inject(timing_frame(t_actuator_received_us=1500001, response_us=500001, result='FAIL'))
            assert rt.session.timing['result'] == 'FAIL'
            rt.session.accept(b'{"type":"timing","result":"PASS"}')
            assert rt.session.timing['result'] == 'FAIL'
            for age, expected in ((1.5, 'STALE'), (3, 'DISCONNECTED')):
                rt.session.last_valid = now[0] - age
                rt.tick()
                assert rt.connection() == expected
                assert rt.session.state['state'] == 'SYSTEM_FAULT'
            print('BLENDER_LIVE_STATE_VISUAL_TIMING_FRESHNESS: PASS')
            errors = []
            def wrong_thread():
                try:
                    rt.controller.apply(state_frame(), 0)
                except RuntimeError:
                    errors.append('guarded')
            thread = threading.Thread(target=wrong_thread)
            thread.start()
            thread.join()
            assert errors == ['guarded']
            for frame_no in (1, 24, 143, 145, 217, 529):
                scene.frame_set(frame_no)
                rt.tick()
                assert abs(handle.rotation_euler.y) < 1e-5
                assert scene.camera.animation_data.action is camera_action
            assert len(scene.timeline_markers) == 15
            print('BLENDER_LIVE_THREAD_GUARD_TOUR: PASS')
            assert bpy.ops.sigas.stop() == {'FINISHED'}
            assert bpy.ops.sigas.stop() == {'FINISHED'}
            assert not worker.is_alive()
            assert rt.receiver.socket is None
            assert not bpy.app.timers.is_registered(rt.tick_callback)
            assert handle.animation_data.action is action
            assert handle.animation_data.action_slot == slot
            assert bpy.ops.sigas.replay() == {'FINISHED'}
            rt.tick()
            assert rt.source == 'RECORDED REPLAY'
            assert rt.connection() == 'DISCONNECTED'
            assert not rt.receiver.running
            assert bpy.ops.sigas.replay_pause() == {'FINISHED'}
            assert rt.replay_paused
            live._stop_before_file_event()
            assert not rt.active
        finally:
            live.unregister()
            live.unregister()
    current = (set(bpy.data.objects.keys()), set(bpy.data.materials.keys()), scene.camera,
               scene.frame_start, scene.frame_end, scene.render.fps,
               [(m.name, m.frame) for m in scene.timeline_markers])
    assert baseline == current
    for name, slots in originals.items():
        assert slots == [(s.link, s.material) for s in bpy.data.objects[name].material_slots]
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as peer:
        peer.bind(('127.0.0.1', rt.receiver.port))
    print('BLENDER_LIVE_CLEANUP_REPLAY_MATERIALS: PASS')
    print('BLENDER_LIVE_SELFTEST: PASS')


if __name__ == '__main__':
    run()
