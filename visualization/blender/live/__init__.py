"""Blender consumer of the SIGAS-RT localhost bridge."""

_runtime = None
_classes = []
_hooks = []


def get_runtime():
    global _runtime
    if _runtime is None:
        from .runtime import LiveRuntime
        _runtime = LiveRuntime()
    return _runtime


def register():
    import atexit
    import bpy
    from .sigas_panel import CLASSES
    from .visual_controller import main_thread_only
    main_thread_only()
    if _classes:
        return
    bpy.app.handlers.persistent(_stop_before_file_event)
    for cls in CLASSES:
        bpy.utils.register_class(cls)
        _classes.append(cls)
    for event in ("load_pre", "save_pre", "quit_pre"):
        handlers = getattr(bpy.app.handlers, event, None)
        if handlers is not None:
            handlers.append(_stop_before_file_event)
            _hooks.append(handlers)
    atexit.register(_close_transport)
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.show_region_ui = True


def _stop_before_file_event(*args):
    if _runtime is not None:
        _runtime.stop()


def _close_transport():
    if _runtime is not None:
        _runtime.receiver.stop()


def unregister():
    global _runtime
    import atexit
    import bpy
    from .visual_controller import main_thread_only
    main_thread_only()
    if _runtime is not None:
        _runtime.stop()
        _runtime = None
    for handlers in _hooks:
        if _stop_before_file_event in handlers:
            handlers.remove(_stop_before_file_event)
    _hooks.clear()
    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)
    _classes.clear()
    atexit.unregister(_close_transport)
