"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "lucide-react";
import { Doctor } from "@/types/appointment";

interface AppointmentsMapProps {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  onDoctorSelect: (doctor: Doctor | null) => void;
  onBookAppointment?: (doctor: Doctor) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

type RoutingResponse = {
  routes?: Array<{
    geometry: GeoJSON.LineString;
    distance: number;
    duration: number;
  }>;
};

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };
const ROUTE_SOURCE_ID = "doctor-route";
const ROUTE_LAYER_ID = "doctor-route-line";
const ROUTE_OUTLINE_LAYER_ID = "doctor-route-outline";

const SAMPLE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "BS. Nguyễn Văn Minh": { lat: 10.782, lng: 106.6952 },
  "BS. Trần Thị": { lat: 10.7895, lng: 106.701 },
};

export default function AppointmentsMap({
  doctors,
  selectedDoctor,
  onDoctorSelect,
  onBookAppointment,
  center,
  zoom = 13,
}: AppointmentsMapProps) {
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const popupsRef = useRef<Map<string, MapLibrePopup>>(new Map());
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const routeAbortControllerRef = useRef<AbortController | null>(null);
  const activeRouteDoctorRef = useRef<string | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null);
  const [routePositions, setRoutePositions] = useState<{
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  } | null>(null);

  const formatDistance = useCallback((meters: number) => {
    if (!meters) return "0 m";
    if (meters >= 1000) {
      const km = meters / 1000;
      return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    if (!seconds) return "0 phút";
    const totalMinutes = Math.round(seconds / 60);
    if (totalMinutes < 60) {
      return `${totalMinutes} phút`;
    }
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      return `${hours} giờ`;
    }
    return `${hours} giờ ${minutes} phút`;
  }, []);

  const resolvedCenter = useMemo(() => center ?? DEFAULT_CENTER, [center]);

  const { styleUrl } = useMemo(() => {
    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    const maptilerStyle = process.env.NEXT_PUBLIC_MAPTILER_STYLE_URL;
    if (maptilerKey && maptilerStyle) {
      return { styleUrl: maptilerStyle.replace("{key}", maptilerKey) };
    }
    return {
      styleUrl: {
        version: 8 as const,
        sources: {
          osm: {
            type: "raster" as const,
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap Contributors",
            maxzoom: 19,
          },
        },
        layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
      },
    };
  }, []);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    setMapContainer(node);
  }, []);

  useEffect(() => {
    if (!mapContainer) return;
    try {
      setError(null);
      setIsMapReady(false);
      const map = new maplibregl.Map({
        container: mapContainer,
        style: styleUrl,
        center: [resolvedCenter.lng, resolvedCenter.lat],
        zoom,
      });
      map.getCanvas().tabIndex = -1;
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      mapInstanceRef.current = map;
      const handleLoad = () => setIsMapReady(true);
      map.on("load", handleLoad);
      map.on("popupopen", () => {
        const popupEl = document.querySelector(".maplibregl-popup");
        if (popupEl) (popupEl as HTMLElement).tabIndex = -1;
      });
      return () => {
        map.off("load", handleLoad);
        map.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      };
    } catch (err) {
      console.error("Map initialization error:", err);
      setError("Không thể khởi tạo bản đồ");
    }
  }, [mapContainer, styleUrl, resolvedCenter, zoom]);

  const requestUserLocation = useCallback(async () => {
    if (!mapInstanceRef.current) {
      setLocationError("Bản đồ chưa sẵn sàng để xác định vị trí.");
      return null;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(userPos);
          if (userMarkerRef.current) userMarkerRef.current.remove();
          const el = document.createElement("div");
          el.innerHTML = `<div style="width:24px;height:24px;background:#DC2626;border:3px solid white;border-radius:50%;box-shadow:0 0 12px 4px rgba(220,38,38,0.5);position:relative;"><div style="position:absolute;top:-10px;left:-10px;right:-10px;bottom:-10px;border:3px solid #DC2626;border-radius:50%;opacity:0;animation:pulse 1.5s infinite ease-out;"></div></div>`;
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([userPos.lng, userPos.lat])
            .addTo(mapInstanceRef.current!);
          userMarkerRef.current = marker;
          setIsRequestingLocation(false);
          setTimeout(() => {
            mapInstanceRef.current?.flyTo({
              center: [userPos.lng, userPos.lat],
              zoom: 15,
              speed: 1.2,
              curve: 1.5,
              essential: true,
            });
          }, 200);
          resolve(userPos);
        },
        (err) => {
          console.error("Không lấy được vị trí:", err);
          setLocationError("Không thể xác định vị trí của bạn.");
          setIsRequestingLocation(false);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  const getDoctorCoordinates = useCallback((doctor: Doctor): { lat: number; lng: number } | null => {
    if (doctor.latitude && doctor.longitude) return { lat: doctor.latitude, lng: doctor.longitude };
    const coords = SAMPLE_COORDINATES[doctor.fullName];
    if (coords) return coords;
    const randomLat = DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.05;
    const randomLng = DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.05;
    return { lat: randomLat, lng: randomLng };
  }, []);

  const createDoctorMarker = useCallback((doctor: Doctor, isSelected: boolean) => {
    const el = document.createElement("div");
    el.style.cssText = "width:32px; height:32px; cursor:pointer;";
    el.title = `${doctor.fullName} - ${doctor.specialty || "Bác sĩ"}`;
    const backgroundColor = isSelected ? "#059669" : "#3b82f6";
    const shadowColor = isSelected ? "rgba(5,150,105,0.5)" : "rgba(59,130,246,0.5)";
    const markerEl = document.createElement("div");
    markerEl.style.transition = "all 0.2s ease-in-out";
    markerEl.innerHTML = `<div style="width:26px;height:26px;background:${backgroundColor};border:3px solid white;border-radius:50%;box-shadow:0 0 20px 6px ${shadowColor};position:relative;z-index:10;"><div style="position:absolute;top:-10px;left:-10px;right:-10px;bottom:-10px;border:3px solid ${backgroundColor};border-radius:50%;opacity:0;animation:pulse 1.5s infinite ease-out;"></div></div>`;
    el.onmouseover = () => {
      markerEl.style.transform = "scale(1.15)";
      el.style.zIndex = "1001";
    };
    el.onmouseout = () => {
      markerEl.style.transform = "scale(1)";
      el.style.zIndex = "1000";
    };
    el.appendChild(markerEl);
    return el;
  }, []);

  const createPopupContent = useCallback((doctor: Doctor, doctorId: string) => {
    const navigationIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px; vertical-align: middle;"><path d="m3 11 19-9-9 19-2-8-8-2z"></path></svg>`;
    return `<div style="font-family: 'Segoe UI', sans-serif; min-width: 280px; max-width: 320px;"><div style="padding: 16px 16px 12px 16px;"><h3 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 700;">${
      doctor.fullName
    }</h3><p style="margin: 0; font-size: 14px; color: #00a6f4; font-weight: 600;">${
      doctor.specialty || "Bác sĩ"
    }</p></div>${
      doctor.address
        ? `<div style="padding: 0 16px 12px 16px; display: flex; align-items: start; gap: 8px; border-bottom: 1px solid #f3f4f6;"><span style="font-size: 14px; color: #6b7280; margin-top: 2px;">📍</span><div style="flex: 1;"><p style="margin: 0; font-size: 13px;">${doctor.address}</p></div></div>`
        : ""
    }<div style="display: flex; gap: 8px; padding: 12px 16px;"><button id="directions-btn-${doctorId}" style="flex:1;display:inline-flex;align-items:center;justify-content:center;padding:9px 12px;border-radius:8px;border:1px solid #d1d5db;background-color:#f9fafb;color:#374151;font-weight:600;cursor:pointer;font-size:13px;transition:all .2s ease" onmouseover="this.style.backgroundColor='#f3f4f6';" onmouseout="this.style.backgroundColor='#f9fafb';">${navigationIcon}Chỉ đường</button><button id="book-btn-${doctorId}" style="flex:1;padding:10px 14px;border-radius:8px;border:none;background-color:#00a6f4;color:white;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s ease" onmouseover="this.style.backgroundColor='#2563eb';" onmouseout="this.style.backgroundColor='#00a6f4';">Đặt lịch</button></div></div>`;
  }, []);

  const clearRoute = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (map.getLayer(ROUTE_LAYER_ID)) {
      map.removeLayer(ROUTE_LAYER_ID);
    }
    if (map.getLayer(ROUTE_OUTLINE_LAYER_ID)) {
      map.removeLayer(ROUTE_OUTLINE_LAYER_ID);
    }
    if (map.getSource(ROUTE_SOURCE_ID)) {
      map.removeSource(ROUTE_SOURCE_ID);
    }
    setRouteInfo(null);
    setRoutePositions(null);
    activeRouteDoctorRef.current = null;
    routeAbortControllerRef.current?.abort();
    routeAbortControllerRef.current = null;
    setIsRouting(false);
  }, [setRouteInfo, setIsRouting]);

  const drawRouteOnMap = useCallback(
    async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, doctorKey?: string) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      clearRoute();
      routeAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      routeAbortControllerRef.current = abortController;

      setIsRouting(true);
      setRouteError(null);

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`,
          { signal: abortController.signal }
        );

        if (!response.ok) {
          throw new Error("OSRM request failed");
        }

        const data = (await response.json()) as RoutingResponse;
        const route = data.routes?.[0];

        if (!route?.geometry?.coordinates?.length) {
          throw new Error("Route data unavailable");
        }

        const routeFeatureCollection: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          ],
        };

        if (map.getSource(ROUTE_SOURCE_ID)) {
          (map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource).setData(routeFeatureCollection);
        } else {
          map.addSource(ROUTE_SOURCE_ID, {
            type: "geojson",
            data: routeFeatureCollection,
          });
        }

        if (!map.getLayer(ROUTE_OUTLINE_LAYER_ID)) {
          map.addLayer({
            id: ROUTE_OUTLINE_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#1e3a8a",
              "line-width": 8,
              "line-opacity": 0.25,
            },
          });
        }

        if (!map.getLayer(ROUTE_LAYER_ID)) {
          map.addLayer({
            id: ROUTE_LAYER_ID,
            type: "line",
            source: ROUTE_SOURCE_ID,
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": "#2563eb",
              "line-width": 4,
            },
          });
        }

        const bounds = new maplibregl.LngLatBounds([origin.lng, origin.lat], [destination.lng, destination.lat]);

        route.geometry.coordinates.forEach(([lng, lat]) => {
          bounds.extend([lng, lat]);
        });

        map.fitBounds(bounds, { padding: 80, maxZoom: 16, duration: 800 });
        setRouteInfo({ distance: route.distance, duration: route.duration });
        setRoutePositions({ origin, destination });
        if (doctorKey) {
          activeRouteDoctorRef.current = doctorKey;
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }
        console.error("Không thể lấy tuyến đường:", err);
        setRouteError("Không thể tìm được đường đi. Vui lòng thử lại.");
      } finally {
        setIsRouting(false);
        routeAbortControllerRef.current = null;
      }
    },
    [clearRoute]
  );

  useEffect(() => {
    if (!selectedDoctor) {
      clearRoute();
      setRouteError(null);
      return;
    }

    const currentDoctorKey = (selectedDoctor._id || selectedDoctor.id || selectedDoctor.fullName).replace(/\s+/g, "-");

    if (activeRouteDoctorRef.current && activeRouteDoctorRef.current !== currentDoctorKey) {
      clearRoute();
      setRouteError(null);
    }
  }, [selectedDoctor, clearRoute, setRouteError]);

  useEffect(() => {
    if (!activeRouteDoctorRef.current) return;
    const stillExists = doctors.some((doctor) => {
      const doctorKey = (doctor._id || doctor.id || doctor.fullName).replace(/\s+/g, "-");
      return doctorKey === activeRouteDoctorRef.current;
    });
    if (!stillExists) {
      clearRoute();
      setRouteError(null);
    }
  }, [doctors, clearRoute, setRouteError]);

  // useEffect DUY NHẤT để xử lý toàn bộ logic của bản đồ
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // 1. Dọn dẹp các elements cũ
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    popupsRef.current.forEach((popup) => popup.remove());
    popupsRef.current.clear();

    // 2. Tạo lại tất cả markers và popups
    doctors.forEach((doctor) => {
      const coords = getDoctorCoordinates(doctor);
      if (!coords) return;
      const isSelected = selectedDoctor?._id === doctor._id;
      const markerEl = createDoctorMarker(doctor, isSelected);
      const doctorId = (doctor._id || doctor.id || doctor.fullName).replace(/\s+/g, "-");
      const popupHtml = createPopupContent(doctor, doctorId);
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: true,
        offset: 25,
        maxWidth: "350px",
        className: "doctor-popup",
      }).setHTML(popupHtml);
      const marker = new MapLibreMarker({ element: markerEl })
        .setLngLat([coords.lng, coords.lat])
        .addTo(mapInstanceRef.current!);

      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();

        const doctorId = (doctor._id || doctor.id || doctor.fullName).replace(/\s+/g, "-");
        const coords = getDoctorCoordinates(doctor);
        const popup = popupsRef.current.get(doctorId);

        // Đóng tất cả popup khác
        popupsRef.current.forEach((p) => p.remove());

        if (popup && coords) {
          popup.setLngLat([coords.lng, coords.lat]).addTo(mapInstanceRef.current!);
        }

        // Cập nhật selectedDoctor sau đó
        if (selectedDoctor && selectedDoctor._id === doctor._id) {
          onDoctorSelect(null);
        } else {
          onDoctorSelect(doctor);
        }
      });

      markersRef.current.set(doctorId, marker);
      popupsRef.current.set(doctorId, popup);
    });

    // 3. Xử lý bác sĩ đang được chọn (di chuyển bản đồ và mở popup)
    if (selectedDoctor) {
      const coords = getDoctorCoordinates(selectedDoctor);
      if (!coords) return;
      mapInstanceRef.current.flyTo({ center: [coords.lng, coords.lat], zoom: 15, essential: true });
      const doctorId = (selectedDoctor._id || selectedDoctor.id || selectedDoctor.fullName).replace(/\s+/g, "-");
      const popup = popupsRef.current.get(doctorId);
      if (popup && !popup.isOpen()) {
        popup.setLngLat([coords.lng, coords.lat]).addTo(mapInstanceRef.current);
        setTimeout(() => {
          const directionsBtn = document.getElementById(`directions-btn-${doctorId}`);
          const bookBtn = document.getElementById(`book-btn-${doctorId}`);
          if (directionsBtn) {
            directionsBtn.onclick = async (e) => {
              e.preventDefault();
              setRouteError(null);
              let originLocation = userLocation;
              if (!originLocation) {
                originLocation = await requestUserLocation();
              }
              if (!originLocation) {
                setRouteError("Vui lòng cho phép truy cập vị trí để chỉ đường.");
                return;
              }
              const originalContent = directionsBtn.innerHTML;
              directionsBtn.innerHTML = "<span>Đang tính tuyến...</span>";
              directionsBtn.setAttribute("disabled", "true");
              directionsBtn.style.opacity = "0.7";
              directionsBtn.style.cursor = "not-allowed";
              try {
                await drawRouteOnMap(originLocation, coords, doctorId);
              } finally {
                directionsBtn.removeAttribute("disabled");
                directionsBtn.style.opacity = "";
                directionsBtn.style.cursor = "";
                directionsBtn.innerHTML = originalContent;
              }
            };
          }
          if (bookBtn && onBookAppointment) {
            bookBtn.onclick = (e) => {
              e.preventDefault();
              popup.remove();
              onBookAppointment(selectedDoctor);
            };
          }
        }, 150);
      }
    } else if (markersRef.current.size > 0) {
      // 4. Nếu không có ai được chọn, căn giữa bản đồ
      const bounds = new maplibregl.LngLatBounds();
      markersRef.current.forEach((marker) => bounds.extend(marker.getLngLat()));
      if (userLocation) bounds.extend([userLocation.lng, userLocation.lat]);
      mapInstanceRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
    }
  }, [
    doctors,
    isMapReady,
    selectedDoctor,
    userLocation,
    getDoctorCoordinates,
    createDoctorMarker,
    createPopupContent,
    onDoctorSelect,
    onBookAppointment,
    drawRouteOnMap,
    requestUserLocation,
  ]);

  return (
    <div className="relative w-full h-full">
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 0.6;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(2);
          }
        }
        .maplibregl-popup.doctor-popup .maplibregl-popup-content {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          padding: 0;
          font-family: "Segoe UI", sans-serif;
        }
        .maplibregl-popup.doctor-popup .maplibregl-popup-tip {
          border-top-color: white;
        }
        .maplibregl-popup.doctor-popup .maplibregl-popup-close-button {
          color: #6b7280;
          font-size: 20px;
          right: 8px;
          top: 8px;
        }
        .maplibregl-popup.doctor-popup .maplibregl-popup-close-button:hover {
          color: #374151;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
      `}</style>
      <div ref={mapRef} className="w-full h-full" />
      {!isMapReady && !error && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải bản đồ...</p>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 flex flex-col gap-3 max-w-xs z-20">
        {routeError && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="leading-relaxed">{routeError}</p>
              <button
                onClick={() => setRouteError(null)}
                className="text-[11px] font-semibold text-red-500 hover:text-red-600"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
        {routeInfo && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-sm text-gray-900 mb-2">
                  Đường đi tới {selectedDoctor?.fullName ?? "bác sĩ"}
                </h4>
                <p className="text-xs text-gray-600">
                  Khoảng cách: <span className="font-semibold text-gray-900">{formatDistance(routeInfo.distance)}</span>
                </p>
                <p className="text-xs text-gray-600">
                  Thời gian dự kiến:{" "}
                  <span className="font-semibold text-gray-900">{formatDuration(routeInfo.duration)}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => {
                    clearRoute();
                    setRouteError(null);
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Xóa
                </button>
              </div>
            </div>
            {routePositions && (
              <button
                onClick={() => {
                  const { origin, destination } = routePositions;
                  const url = `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline"
              >
                Mở Google Maps
              </button>
            )}
          </div>
        )}
        {isRouting && (
          <div className="bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Đang tính toán tuyến đường...
            </div>
          </div>
        )}
        {!userLocation && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <h4 className="font-semibold text-sm mb-2">Tìm vị trí của bạn</h4>
            <p className="text-xs text-gray-500 mb-3">Xem bác sĩ gần bạn và chỉ đường</p>
            <button
              onClick={() => {
                void requestUserLocation();
              }}
              disabled={isRequestingLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <MapPin className="w-4 h-4" />
              {isRequestingLocation ? "Đang lấy vị trí..." : "Dùng vị trí của tôi"}
            </button>
            {locationError && <p className="text-xs text-red-500 mt-2">{locationError}</p>}
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <h4 className="font-semibold text-xs mb-2 text-gray-700">Chú thích</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary rounded-full"></div>
              <span className="text-xs text-gray-600">Bác sĩ</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Vị trí của bạn</span>
              </div>
            )}
            {selectedDoctor && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <span className="text-xs text-gray-600">Đang chọn</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
