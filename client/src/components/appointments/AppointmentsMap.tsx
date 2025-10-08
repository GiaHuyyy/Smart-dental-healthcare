"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MapLibreMap, Marker as MapLibreMarker, Popup as MapLibrePopup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Navigation, MapPin } from "lucide-react";
import { Doctor } from "@/types/appointment";

interface AppointmentsMapProps {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  onDoctorSelect: (doctor: Doctor) => void;
  onBookAppointment?: (doctor: Doctor) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

// Default coordinates for Ho Chi Minh City
const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

// Sample coordinates for doctors in HCM area (for testing)
const SAMPLE_COORDINATES: Record<string, { lat: number; lng: number }> = {
  "BS. Nguyễn Văn Minh": { lat: 10.782, lng: 106.6952 }, // District 1
  "BS. Trần Thị": { lat: 10.7895, lng: 106.701 }, // District 3
  // Add more as needed
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

  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const resolvedCenter = useMemo(() => center ?? DEFAULT_CENTER, [center]);

  const { styleUrl, styleError } = useMemo(() => {
    const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    const maptilerStyle = process.env.NEXT_PUBLIC_MAPTILER_STYLE_URL;

    if (maptilerKey && maptilerStyle) {
      return {
        styleUrl: maptilerStyle.replace("{key}", maptilerKey),
        styleError: null,
      };
    }

    // Use OpenStreetMap tiles as fallback
    const osmStyle = {
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
      layers: [
        {
          id: "osm",
          type: "raster" as const,
          source: "osm",
        },
      ],
    };

    // Return OSM style as fallback
    return {
      styleUrl: osmStyle,
      styleError: null,
    };
  }, []);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    setMapContainer(node);
  }, []);

  useEffect(() => {
    if (!mapContainer || styleError) return;

    try {
      setError(null);
      setIsMapReady(false);

      const map = new maplibregl.Map({
        container: mapContainer,
        style: styleUrl,
        center: [resolvedCenter.lng, resolvedCenter.lat],
        zoom,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      mapInstanceRef.current = map;

      const handleLoad = () => {
        setIsMapReady(true);
      };

      map.on("load", handleLoad);

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
  }, [mapContainer, styleUrl, styleError, resolvedCenter, zoom]);

  const requestUserLocation = useCallback(() => {
    if (!mapInstanceRef.current) return;

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userPos = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };

        setUserLocation(userPos);

        // Remove old marker if exists
        if (userMarkerRef.current) {
          userMarkerRef.current.remove();
        }

        // Create new user location marker (red)
        const el = document.createElement("div");
        el.className = "user-location-marker";
        el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #DC2626;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 12px 4px rgba(220,38,38,0.5);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            border: 3px solid #DC2626;
            border-radius: 50%;
            opacity: 0;
            animation: pulse 1.5s infinite ease-out;
          "></div>
        </div>
      `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([userPos.lng, userPos.lat])
          .addTo(mapInstanceRef.current!);

        userMarkerRef.current = marker;
        setIsRequestingLocation(false);

        // Fly to user location
        setTimeout(() => {
          mapInstanceRef.current?.flyTo({
            center: [userPos.lng, userPos.lat],
            zoom: 15,
            speed: 1.2,
            curve: 1.5,
            essential: true,
          });
        }, 200);
      },
      (err) => {
        console.error("Không lấy được vị trí:", err);
        setLocationError("Không thể xác định vị trí của bạn. Vui lòng kiểm tra quyền truy cập vị trí.");
        setIsRequestingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const getDoctorCoordinates = useCallback((doctor: Doctor): { lat: number; lng: number } | null => {
    console.log("🔍 [DEBUG] Fetching coordinates for doctor:", {
      fullName: doctor.fullName,
      hasLatitude: !!doctor.latitude,
      hasLongitude: !!doctor.longitude,
      latitude: doctor.latitude,
      longitude: doctor.longitude,
      clinicAddress: doctor.clinicAddress,
      clinicCity: doctor.clinicCity,
    });

    // First check if doctor has coordinates
    if (doctor.latitude && doctor.longitude) {
      console.log("✅ [DEBUG] Using REAL coordinates from database:", {
        lat: doctor.latitude,
        lng: doctor.longitude,
      });
      return { lat: doctor.latitude, lng: doctor.longitude };
    }

    // Use sample coordinates for demo
    const coords = SAMPLE_COORDINATES[doctor.fullName];
    if (coords) {
      console.log("⚠️ [DEBUG] Using SAMPLE coordinates (hardcoded):", coords);
      return coords;
    }

    // Generate random coordinates near HCM city center for demo
    const randomLat = DEFAULT_CENTER.lat + (Math.random() - 0.5) * 0.05;
    const randomLng = DEFAULT_CENTER.lng + (Math.random() - 0.5) * 0.05;
    console.warn("❌ [DEBUG] Using RANDOM coordinates (no data from API):", {
      lat: randomLat,
      lng: randomLng,
      reason: "Doctor has NO latitude/longitude in database",
    });
    return { lat: randomLat, lng: randomLng };
  }, []);

  const createDoctorMarker = useCallback((doctor: Doctor, isSelected: boolean) => {
    const el = document.createElement("div");

    // Different colors for selected vs normal doctors
    const backgroundColor = isSelected ? "#059669" : "#3b82f6"; // Green for selected, blue for normal
    const shadowColor = isSelected ? "rgba(5,150,105,0.5)" : "rgba(59,130,246,0.5)";

    el.style.cssText = `
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      transform-origin: center center;
    `;

    el.innerHTML = `
  <div style="
    width: 26px;
    height: 26px;
    background: ${backgroundColor};
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 20px 6px ${shadowColor};
    position: relative;
    z-index: 1000;
    transition: all 0.3s ease;
  ">
    <div style="
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border: 3px solid ${backgroundColor};
      border-radius: 50%;
      opacity: 0;
      animation: pulse 1.5s infinite ease-out;
    "></div>
  </div>
`;

    el.title = `${doctor.fullName} - ${doctor.specialty || "Bác sĩ"}`;

    // Add hover effects with proper element reference
    el.addEventListener("mouseenter", () => {
      el.style.transform = "scale(1.15)";
      const innerDiv = el.querySelector("div") as HTMLElement;
      if (innerDiv) {
        innerDiv.style.zIndex = "1001";
      }
    });

    el.addEventListener("mouseleave", () => {
      el.style.transform = "scale(1)";
      const innerDiv = el.querySelector("div") as HTMLElement;
      if (innerDiv) {
        innerDiv.style.zIndex = "1000";
      }
    });

    return el;
  }, []);

  const createPopupContent = useCallback((doctor: Doctor, doctorId: string) => {
    const popupHtml = `
      <div style="padding: 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; min-width: 280px; max-width: 320px;">
        <div style="margin-bottom: 12px;">
          <h3 style="margin: 0 0 6px 0; font-size: 18px; font-weight: 700; color: #1f2937; line-height: 1.3;">
            ${doctor.fullName}
          </h3>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #3b82f6; font-weight: 600;">
            ${doctor.specialty || doctor.specialization || "Bác sĩ"}
          </p>
        </div>

        ${
          doctor.clinicAddress || doctor.address
            ? `
          <div style="margin-bottom: 12px; display: flex; align-items: start; gap: 8px;">
            <span style="font-size: 14px; color: #059669;">📍</span>
            <div style="flex: 1;">
              <p style="margin: 0; font-size: 13px; color: #374151; line-height: 1.4; font-weight: 500;">
                ${doctor.clinicAddress || doctor.address}
              </p>
              ${doctor.clinicCity ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #9ca3af;">${doctor.clinicCity}</p>` : ''}
            </div>
          </div>
        `
            : ""
        }

        ${
          doctor.rating
            ? `
          <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
            <span style="color: #f59e0b; font-size: 14px;">⭐</span>
            <span style="font-size: 13px; color: #f59e0b; font-weight: 600;">
              ${doctor.rating}
            </span>
            ${
              doctor.reviewCount
                ? `
              <span style="font-size: 13px; color: #9ca3af;">
                (${doctor.reviewCount} đánh giá)
              </span>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button
            id="directions-btn-${doctorId}"
            style="
              flex: 1;
              padding: 10px 14px;
              border-radius: 8px;
              border: none;
              background: linear-gradient(135deg, #10b981, #059669);
              color: white;
              font-weight: 600;
              cursor: pointer;
              font-size: 13px;
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
              transition: all 0.2s ease;
            "
            onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(16, 185, 129, 0.3)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(16, 185, 129, 0.2)'"
          >
            🧭 Chỉ đường
          </button>
          <button
            id="book-btn-${doctorId}"
            style="
              padding: 10px 14px;
              border-radius: 8px;
              border: 2px solid #3b82f6;
              background: white;
              color: #3b82f6;
              cursor: pointer;
              font-size: 13px;
              font-weight: 600;
              transition: all 0.2s ease;
            "
            onmouseover="this.style.background='#3b82f6'; this.style.color='white'"
            onmouseout="this.style.background='white'; this.style.color='#3b82f6'"
          >
            � Đặt lịch
          </button>
        </div>
      </div>
    `;
    return popupHtml;
  }, []);

  // Add markers when map is ready
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    console.log("🗺️ [DEBUG] Adding markers to map");
    console.log("📊 [DEBUG] Total doctors:", doctors.length);
    console.log("📊 [DEBUG] Selected doctor:", selectedDoctor?.fullName || "None");

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    popupsRef.current.forEach((popup) => popup.remove());
    popupsRef.current.clear();

    // Add markers for each doctor
    doctors.forEach((doctor) => {
      const coords = getDoctorCoordinates(doctor);
      if (!coords) return;

      const isSelected = selectedDoctor?.fullName === doctor.fullName;
      const markerEl = createDoctorMarker(doctor, isSelected);

      // Create unique doctor ID
      const doctorId = (doctor._id || doctor.id || doctor.fullName || `doctor-${Math.random()}`).replace(/\s+/g, "-");

      // Create popup content using the new function
      const popupHtml = createPopupContent(doctor, doctorId);

      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false,
        offset: 25,
        maxWidth: "350px",
        className: "doctor-popup",
      }).setHTML(popupHtml);

      // Create marker with popup attached - MapTiler recommended approach
      const marker = new MapLibreMarker(markerEl)
        .setLngLat([coords.lng, coords.lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current!);

      // Handle marker click - additional actions
      markerEl.addEventListener("click", (e) => {
        e.stopPropagation();

        // Close all other popups first
        popupsRef.current.forEach((p, id) => {
          if (id !== doctorId) {
            p.remove();
          }
        });

        // Select doctor and fly to location (but DON'T trigger booking)
        onDoctorSelect(doctor);
        mapInstanceRef.current?.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 15,
          essential: true,
        });

        // Attach event listeners to buttons after popup is rendered
        setTimeout(() => {
          const directionsBtn = document.getElementById(`directions-btn-${doctorId}`);
          const bookBtn = document.getElementById(`book-btn-${doctorId}`);

          if (directionsBtn) {
            directionsBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Build Google Maps directions URL
              const destination = `${coords.lat},${coords.lng}`;
              let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

              // Add origin if user location is available
              if (userLocation) {
                const origin = `${userLocation.lat},${userLocation.lng}`;
                url += `&origin=${encodeURIComponent(origin)}`;
              }

              // Add destination name for better UX
              if (doctor.clinicAddress) {
                url += `&destination_place_id=${encodeURIComponent(doctor.clinicAddress)}`;
              }

              window.open(url, "_blank", "noopener,noreferrer");
            };
          }

          if (bookBtn) {
            bookBtn.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();

              // Close popup and trigger booking flow
              popup.remove();
              onDoctorSelect(doctor);

              // Trigger booking appointment if handler provided
              if (onBookAppointment) {
                onBookAppointment(doctor);
              }
            };
          }
        }, 150); // Small delay to ensure DOM is ready
      });

      markersRef.current.set(doctorId, marker);
      popupsRef.current.set(doctorId, popup);
    });

    // Fit bounds if there are markers
    if (markersRef.current.size > 0 && !selectedDoctor) {
      const bounds = new maplibregl.LngLatBounds();
      markersRef.current.forEach((marker) => {
        bounds.extend(marker.getLngLat());
      });

      if (userLocation) {
        bounds.extend([userLocation.lng, userLocation.lat]);
      }

      mapInstanceRef.current.fitBounds(bounds, {
        padding: 80,
        maxZoom: 14,
      });
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
  ]);

  // Handle selected doctor
  useEffect(() => {
    if (!selectedDoctor || !mapInstanceRef.current || !isMapReady) return;

    const coords = getDoctorCoordinates(selectedDoctor);
    if (!coords) return;

    mapInstanceRef.current.flyTo({
      center: [coords.lng, coords.lat],
      zoom: 15,
      essential: true,
    });

    // Update marker appearance
    const doctorId = selectedDoctor._id || selectedDoctor.fullName;
    const marker = markersRef.current.get(doctorId);
    if (marker) {
      const markerEl = createDoctorMarker(selectedDoctor, true);
      marker.getElement().replaceWith(markerEl);
    }
  }, [selectedDoctor, isMapReady, getDoctorCoordinates, createDoctorMarker]);

  const showDirections = useCallback(() => {
    if (!selectedDoctor || !userLocation) return;

    const coords = getDoctorCoordinates(selectedDoctor);
    if (!coords) return;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    window.open(url, "_blank");
  }, [selectedDoctor, userLocation, getDoctorCoordinates]);

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

        /* Custom popup styles */
        .maplibregl-popup.doctor-popup .maplibregl-popup-content {
          border-radius: 12px;
          box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
          padding: 0;
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        }

        .maplibregl-popup.doctor-popup .maplibregl-popup-tip {
          border-top-color: #f9fafb;
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Đang tải bản đồ...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center z-10">
          <div className="text-center text-red-600 p-6">
            <p className="font-semibold mb-2">Lỗi tải bản đồ</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="absolute top-4 left-4 flex flex-col gap-3 max-w-xs z-20">
        {/* Location Button */}
        {!userLocation && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <h4 className="font-semibold text-sm mb-2">Tìm vị trí của bạn</h4>
            <p className="text-xs text-gray-500 mb-3">Xem bác sĩ gần bạn và chỉ đường</p>
            <button
              onClick={requestUserLocation}
              disabled={isRequestingLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <MapPin className="w-4 h-4" />
              {isRequestingLocation ? "Đang lấy vị trí..." : "Dùng vị trí của tôi"}
            </button>
            {locationError && <p className="text-xs text-red-500 mt-2">{locationError}</p>}
          </div>
        )}

        {/* Doctor Info & Directions */}
        {selectedDoctor && (
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="mb-3">
              <h4 className="font-bold text-sm text-gray-900">{selectedDoctor.fullName}</h4>
              <p className="text-xs text-blue-600 font-medium">{selectedDoctor.specialty || "Bác sĩ"}</p>
              {selectedDoctor.clinicAddress && (
                <p className="text-xs text-gray-500 mt-1">📍 {selectedDoctor.clinicAddress}</p>
              )}
            </div>

            {userLocation && (
              <button
                onClick={showDirections}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Navigation className="w-4 h-4" />
                Chỉ đường
              </button>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg p-3">
          <h4 className="font-semibold text-xs mb-2 text-gray-700">Chú thích</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Bác sĩ</span>
            </div>
            {userLocation && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow"></div>
                <span className="text-xs text-gray-600">Vị trí của bạn</span>
              </div>
            )}
            {selectedDoctor && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <span className="text-xs text-gray-600">Đang chọn</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
