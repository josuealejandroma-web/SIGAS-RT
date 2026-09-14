# Distribucion de tuberias

Fuente geometrica: create_gas_system.py, create_ground_floor.py y
create_upper_floor.py de la base435db425. Coordenadas locales(X,Y-altura,Z).
La rotacion del ModelRoot transforma a Z-up en Blender.

V1 troncal: (-6.2,.55,-3.05) -> (-4.7,.55,-3.05) -> (0,.55,-3.05)
-> (3.4,.55,-3.05). Cocina deriva en(-3.35,.55,-3.05) y termina en estufa
(-3.55,.85,-2.55); calefon deriva(3.25,.55,-3.05) a(3.45,1.35,-3.05).
Medidor x=-5.85; manual x=-4.95; automatica x=-.45: NO es maestra de cocina.

| Habitacion | Tuberia V1 | Cambio V2 propuesto | Gas/aparato | Instrumentacion/accion |
| --- | --- | --- | --- | --- |
| Entrada exterior/medidor | Troncal | VM antes de cualquier ramal | Sin aparato | P0/P1, master close |
| Cocina | Derivacion y estufa | Ramal independiente trasVK | GS1/estufa | PK/VK; cierre localizado |
| Area tecnica | Troncal y calefon | Ramal trasVT | GS2/calefon | PT/VT; cierre localizado |
| Living/sala | NO | Nuevo ramal de ensayo terminal | GS3, sin aparato | PL/VL; rotura localizada |
| Comedor | No ramal identificado | Sin aparato/ramal terminal nuevo | Ninguno | Zona no instrumentada directamente |
| Entrada/bano visitas | No | Sin cambios previstos | Ninguno | Sin cobertura gas dedicada |
| Escaleras/pasillo | No | Sin cambios previstos | Ninguno | Sin cobertura gas dedicada |
| Dormitorio principal/2/3 | No | Sin cambios previstos | Ninguno | No inventar tuberia |
| Bano superior | No | Sin cambios previstos | Ninguno | No inventar aparato GN |
| Balcon/terraza | No | Sin cambios previstos | Ninguno | Sin cambios |

Las curvas son polilineas graficas, no planos de montaje. Las uniones logicas
son entrada, manifold, derivaciones y terminales. Collares/supports graficos
no constituyen inventario certificado de uniones mecanicas. La revision V2
debe cotejar cada tramo con limites de habitaciones y publicar plano visual.
