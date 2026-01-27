// @ts-nocheck

import { Map as LeafletMap } from 'leaflet';

declare module 'react-leaflet' {
    interface MapContainerProps {
        /**
         * Callback that is called when the map instance is created.
         * This prop is not present in the default type definitions for older versions.
         */
        whenCreated?: (map: LeafletMap) => void;
    }
}
