import { useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, InfoWindow } from '@react-google-maps/api';
import type { CitySearchResult, RouteOption, TransportMode } from '../../types';
import { TRANSPORT_COLORS } from '../../types';
import { useUIStore } from '../../stores';

interface GoogleMapProps {
  originCity?: CitySearchResult | null;
  destCity?: CitySearchResult | null;
  routes?: RouteOption[];
  height?: string;
  onMapSelectOrigin?: (city: CitySearchResult) => void;
  onMapSelectDestination?: (city: CitySearchResult) => void;
}

const defaultCenter = { lat: 22.5, lng: 80.0 }; // Center of India
const LIBRARIES: "places"[] = ["places"];

// Helper to create a custom SVG marker
const createSvgMarker = (color: string) => {
  return {
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
    fillColor: color,
    fillOpacity: 1,
    strokeWeight: 2,
    strokeColor: '#FFFFFF',
    scale: 1.5,
    anchor: new google.maps.Point(12, 22),
  };
};

// Reverse-geocode latlng to a city name
async function reverseGeocode(lat: number, lng: number): Promise<CitySearchResult | null> {
  try {
    const geocoder = new google.maps.Geocoder();
    const resp = await geocoder.geocode({ location: { lat, lng } });
    if (!resp.results || resp.results.length === 0) return null;

    let cityName = '';
    let stateName = '';
    for (const result of resp.results) {
      for (const comp of result.address_components) {
        if (comp.types.includes('locality') && !cityName) cityName = comp.long_name;
        if (comp.types.includes('administrative_area_level_2') && !cityName) cityName = comp.long_name;
        if (comp.types.includes('administrative_area_level_1') && !stateName) stateName = comp.long_name;
      }
      if (cityName) break;
    }

    if (!cityName) {
      cityName = resp.results[0].formatted_address.split(',')[0];
    }

    return {
      name: cityName,
      station: stateName ? `${cityName}, ${stateName}` : cityName,
      code: cityName.substring(0, 3).toUpperCase(),
      airport: '',
      lat,
      lon: lng,
      display: stateName ? `${cityName}, ${stateName}` : cityName,
    };
  } catch {
    return null;
  }
}

export default function GoogleMapComponent({
  originCity, destCity, routes = [], height = '100%',
  onMapSelectOrigin, onMapSelectDestination,
}: GoogleMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeInfoWindow, setActiveInfoWindow] = useState<string | null>(null);
  const { theme } = useUIStore();

  const activeRoute = useMemo(() => {
    if (!routes || routes.length === 0) return null;
    return routes.find(r => r.ml_rank === 1) || routes[0];
  }, [routes]);

  const intermediateStops = useMemo(() => {
    if (!activeRoute) return [];
    const stops: Array<{ name: string; station_name: string; lat: number; lng: number; mode: string }> = [];
    const seen = new Set<string>();

    activeRoute.segments.forEach((seg, idx) => {
      if (idx > 0) {
        const stop = seg.origin_stop;
        const key = `${stop.latitude.toFixed(4)},${stop.longitude.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          stops.push({
            name: stop.city,
            station_name: stop.station_name,
            lat: stop.latitude,
            lng: stop.longitude,
            mode: seg.mode,
          });
        }
      }
      if (idx < activeRoute.segments.length - 1) {
        const stop = seg.destination_stop;
        const key = `${stop.latitude.toFixed(4)},${stop.longitude.toFixed(4)}`;
        if (!seen.has(key)) {
          seen.add(key);
          stops.push({
            name: stop.city,
            station_name: stop.station_name,
            lat: stop.latitude,
            lng: stop.longitude,
            mode: seg.mode,
          });
        }
      }
    });
    return stops;
  }, [activeRoute]);

  // Selection mode: 'origin' when no origin, 'destination' when origin set but no dest
  const selectionMode = !originCity ? 'origin' : !destCity ? 'destination' : null;
  const canSelect = !!onMapSelectOrigin && !!onMapSelectDestination;

  // Temporary click marker while reverse geocoding
  const [pendingClick, setPendingClick] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const mapStyles = useMemo(() => {
    const darkStyle = [
      { elementType: 'geometry', stylers: [{ color: '#1C2F47' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#050D1A' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#8BA3C7' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#E8F4FF' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0D1B2E' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3B9EFF' }] },
    ];

    const lightStyle = [
      { elementType: 'geometry', stylers: [{ color: '#FFF5EC' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#FFF9F4' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#6B5A8A' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#1A1035' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#E0DFF8' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6C3CE0' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFE6D5' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F0D9C7' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E8F5E9' }] },
    ];

    return theme === 'light' ? lightStyle : darkStyle;
  }, [theme]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Handle map clicks for origin/destination selection
  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!canSelect || !selectionMode || isGeocoding) return;
    const lat = e.latLng?.lat();
    const lng = e.latLng?.lng();
    if (lat === undefined || lng === undefined) return;

    setPendingClick({ lat, lng });
    setIsGeocoding(true);

    const city = await reverseGeocode(lat, lng);
    setPendingClick(null);
    setIsGeocoding(false);

    if (!city) return;

    if (selectionMode === 'origin') {
      onMapSelectOrigin!(city);
    } else {
      onMapSelectDestination!(city);
    }
  }, [canSelect, selectionMode, isGeocoding, onMapSelectOrigin, onMapSelectDestination]);

  // Fit bounds when markers change
  useMemo(() => {
    if (!map || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    if (originCity) {
      bounds.extend({ lat: originCity.lat, lng: originCity.lon });
      hasPoints = true;
    }
    if (destCity) {
      bounds.extend({ lat: destCity.lat, lng: destCity.lon });
      hasPoints = true;
    }

    if (activeRoute) {
      activeRoute.segments.forEach((seg) => {
        bounds.extend({ lat: seg.origin_stop.latitude, lng: seg.origin_stop.longitude });
        bounds.extend({ lat: seg.destination_stop.latitude, lng: seg.destination_stop.longitude });
      });
      hasPoints = true;
    }

    if (hasPoints) {
      map.fitBounds(bounds, 80);
    } else {
      map.setCenter(defaultCenter);
      map.setZoom(5);
    }
  }, [map, originCity, destCity, activeRoute]);

  if (loadError) return <div style={{ padding: 20, color: 'red' }}>Error loading Google Maps</div>;
  if (!isLoaded) return <div style={{ width: '100%', height, background: 'var(--bg-surface)' }} className="skeleton" />;

  return (
    <div style={{ width: '100%', height, minHeight: 400, position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', cursor: canSelect && selectionMode ? 'crosshair' : undefined }}
        center={defaultCenter}
        zoom={5}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          mapTypeId: 'hybrid',
          styles: mapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
        }}
      >
        {/* Origin Marker */}
        {originCity && (
          <Marker
            position={{ lat: originCity.lat, lng: originCity.lon }}
            icon={createSvgMarker('#3B9EFF')}
            onClick={() => setActiveInfoWindow('origin')}
          >
            {activeInfoWindow === 'origin' && (
              <InfoWindow onCloseClick={() => setActiveInfoWindow(null)}>
                <div style={{ color: '#000', padding: 4 }}>
                  <strong style={{ fontSize: '14px' }}>{originCity.name}</strong><br />
                  <span style={{ fontSize: '12px' }}>{originCity.station}</span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Destination Marker */}
        {destCity && (
          <Marker
            position={{ lat: destCity.lat, lng: destCity.lon }}
            icon={createSvgMarker('#F59E0B')}
            onClick={() => setActiveInfoWindow('dest')}
          >
            {activeInfoWindow === 'dest' && (
              <InfoWindow onCloseClick={() => setActiveInfoWindow(null)}>
                <div style={{ color: '#000', padding: 4 }}>
                  <strong style={{ fontSize: '14px' }}>{destCity.name}</strong><br />
                  <span style={{ fontSize: '12px' }}>{destCity.station}</span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        )}

        {/* Pending click marker (pulsing while geocoding) */}
        {pendingClick && (
          <Marker
            position={pendingClick}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: selectionMode === 'origin' ? '#3B9EFF' : '#F59E0B',
              fillOpacity: 0.6,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 10,
            }}
          />
        )}

        {/* Dashed line connecting origin/dest when no routes exist */}
        {originCity && destCity && routes.length === 0 && (
          <Polyline
            key={`dashed-${originCity.lat}-${originCity.lon}-${destCity.lat}-${destCity.lon}`}
            path={[
              { lat: originCity.lat, lng: originCity.lon },
              { lat: destCity.lat, lng: destCity.lon }
            ]}
            options={{
              strokeColor: '#3B9EFF',
              strokeOpacity: 0,
              strokeWeight: 3,
              icons: [{
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 },
                offset: '0',
                repeat: '20px'
              }]
            }}
          />
        )}

        {/* Intermediate stops */}
        {activeRoute && intermediateStops.map((stop, idx) => (
          <Marker
            key={`inter-stop-${idx}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: TRANSPORT_COLORS[stop.mode as TransportMode] || '#94A3B8',
              fillOpacity: 0.9,
              strokeWeight: 1.5,
              strokeColor: '#FFFFFF',
              scale: 6,
            }}
            onClick={() => setActiveInfoWindow(`stop-${idx}`)}
          >
            {activeInfoWindow === `stop-${idx}` && (
              <InfoWindow onCloseClick={() => setActiveInfoWindow(null)}>
                <div style={{ color: '#000', padding: 4 }}>
                  <strong style={{ fontSize: '12px' }}>{stop.name}</strong><br />
                  <span style={{ fontSize: '11px' }}>{stop.station_name}</span>
                </div>
              </InfoWindow>
            )}
          </Marker>
        ))}

        {/* Polylines for Active Route */}
        {activeRoute && activeRoute.segments.map((seg, segIdx) => {
          const isFlight = seg.mode === 'flight';
          const color = TRANSPORT_COLORS[seg.mode] || '#3B9EFF';

          return (
            <Polyline
              key={`route-active-seg-${segIdx}`}
              path={[
                { lat: seg.origin_stop.latitude, lng: seg.origin_stop.longitude },
                { lat: seg.destination_stop.latitude, lng: seg.destination_stop.longitude }
              ]}
              options={isFlight ? {
                strokeColor: '#8B5CF6',
                strokeOpacity: 0,
                strokeWeight: 4,
                geodesic: true,
                icons: [{
                  icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3, strokeColor: '#8B5CF6' },
                  offset: '0',
                  repeat: '15px'
                }]
              } : {
                strokeColor: color,
                strokeOpacity: 1,
                strokeWeight: 4,
                geodesic: false,
              }}
            />
          );
        })}
      </GoogleMap>

      {/* Selection Mode Indicator */}
      {canSelect && selectionMode && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            borderRadius: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            border: `1px solid ${selectionMode === 'origin' ? 'rgba(59,158,255,0.4)' : 'rgba(245,158,11,0.4)'}`,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: selectionMode === 'origin' ? '#3B9EFF' : '#F59E0B',
              boxShadow: `0 0 8px ${selectionMode === 'origin' ? '#3B9EFF' : '#F59E0B'}`,
              animation: 'ai-pulse 1.5s infinite',
            }} />
            <span style={{
              fontSize: '0.78rem', fontWeight: 600, color: '#fff',
              fontFamily: 'monospace',
            }}>
              {selectionMode === 'origin'
                ? '📍 Click map to set origin'
                : '📍 Click map to set destination'
              }
            </span>
          </div>
        </div>
      )}

      {/* Geocoding spinner */}
      {isGeocoding && (
        <div style={{
          position: 'absolute', top: 52, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
        }}>
          <div style={{
            padding: '6px 14px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '20px',
            fontSize: '0.72rem', color: '#ccc',
            fontFamily: 'monospace',
          }}>
            Resolving location...
          </div>
        </div>
      )}

      {/* Floating Legend Overlay */}
      {activeRoute && (
        <div style={{
          position: 'absolute', bottom: 24, left: 12,
          zIndex: 10,
          background: 'var(--glass-bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          boxShadow: 'var(--shadow-card)',
          display: 'flex', flexDirection: 'column', gap: 6,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Journey Legend
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Array.from(new Set(activeRoute.segments.map(s => s.mode))).map((mode) => {
              const color = TRANSPORT_COLORS[mode] || '#3B9EFF';
              return (
                <div key={mode} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.73rem', color: 'var(--text-primary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
