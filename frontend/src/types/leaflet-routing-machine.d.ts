// src/types/leaflet-routing-machine.d.ts
import * as L from "leaflet";

declare module "leaflet" {
    namespace Routing {
        interface ControlOptions {
            waypoints?: L.LatLng[];
            lineOptions?: any;
            addWaypoints?: boolean;
            draggableWaypoints?: boolean;
            fitSelectedRoutes?: boolean;
            show?: boolean;
            createMarker?: (i: number, wp: any, n: any) => L.Marker | null;
        }
        function control(options?: ControlOptions): L.Control;
    }
}
