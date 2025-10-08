"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { Map as MapLibreMap, Marker as MapLibreMarker, Popup as MapLibrePopup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Navigation } from "lucide-react";
import { Doctor } from "@/types/appointment";

interface GoogleMapProps {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  onDoctorSelect: (doctor: Doctor) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
}

export default function GoogleMapComponent({
  doctors,
  selectedDoctor,
  onDoctorSelect,
  center = { lat: 10.7769, lng: 106.7009 }, // Ho Chi Minh City default
  zoom = 12,
}: GoogleMapProps) {
  const [mapNode, setMapNode] = useState<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, MapLibreMarker>>(new Map());
  const coordinatesCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const popupsRef = useRef<Map<string, MapLibrePopup>>(new Map());

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      setMapNode(node);
    }
  }, []);

  const mapStyleUrl = process.env.NEXT_PUBLIC_MAPTILER_STYLE_URL || process.env.NEXT_PUBLIC_STADIA_STYLE_URL;
  const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;

  useEffect(() => {
    if (!mapNode) {
      return;
    }

    if (!mapStyleUrl) {
      setError("Chưa cấu hình URL style cho MapLibre (NEXT_PUBLIC_MAPTILER_STYLE_URL)");
      return;
    }

    try {
      setError(null);
      setIsMapReady(false);

      const map = new maplibregl.Map({
        container: mapNode,
        style: mapStyleUrl.includes("{key}") && maptilerKey ? mapStyleUrl.replace("{key}", maptilerKey) : mapStyleUrl,
        center: [center.lng, center.lat],
        zoom,
        attributionControl: true,
      });

      map.addControl(new maplibregl.NavigationControl(), "top-right");

      mapInstanceRef.current = map;

      const handleLoad = () => {
        setIsMapReady(true);
      };

      const handleError = (event: unknown) => {
        const mapError = (event as { error?: Error })?.error;
        if (mapError) {
          console.error("Lỗi MapLibre:", mapError);
          setError((prev) => prev ?? "Không thể tải bản đồ MapLibre. Vui lòng kiểm tra cấu hình tile.");
        }
      };

      map.on("load", handleLoad);
      map.on("error", handleError);

      return () => {
        map.off("load", handleLoad);
        map.off("error", handleError);
        map.remove();
        mapInstanceRef.current = null;
        setIsMapReady(false);
      };
    } catch (err) {
      console.error("Không thể khởi tạo MapLibre:", err);
      setError("Không thể khởi tạo bản đồ MapLibre");
    }
  }, [mapNode, mapStyleUrl, maptilerKey, center, zoom]);

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator) || isRequestingLocation) {
      return;
    }

    setIsRequestingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userPos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(userPos);
        setLocationError(null);
        setIsRequestingLocation(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo(userPos);
          const currentZoom = mapInstanceRef.current.getZoom() ?? zoom;
          if (currentZoom < 13) {
            mapInstanceRef.current.setZoom(13);
          }
        }
      },
      (geoError) => {
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "Không thể truy cập vị trí khi chưa được bạn cho phép."
            : geoError.message || "Không thể xác định vị trí của bạn.";
        setLocationError(message);
        setIsRequestingLocation(false);
      }
    );
  }, [isRequestingLocation, zoom]);

  const getDoctorCacheKey = useCallback((doctor: Doctor) => {
    return (
      doctor._id ||
      doctor.id ||
      doctor.email ||
      doctor.phone ||
      `${doctor.fullName || "unknown"}|${doctor.clinicAddress || ""}`
    );
  }, []);

  // Helper function to geocode address
  const fallbackGeocodeAddress = useCallback(async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(address)}`, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data?.lat && data?.lng) {
        return { lat: Number(data.lat), lng: Number(data.lng) };
      }
      return null;
    } catch (fallbackError) {
      console.error("Fallback geocoding failed:", fallbackError);
      return null;
    }
  }, []);

  const getDoctorCoordinates = useCallback(
    async (doctor: Doctor): Promise<{ lat: number; lng: number } | null> => {
      const cacheKey = getDoctorCacheKey(doctor);

      if (coordinatesCacheRef.current.has(cacheKey)) {
        return coordinatesCacheRef.current.get(cacheKey)!;
      }

      if (doctor.latitude && doctor.longitude) {
        const coords = { lat: doctor.latitude, lng: doctor.longitude };
        coordinatesCacheRef.current.set(cacheKey, coords);
        return coords;
      }

      const addressCandidates = [
        doctor.clinicAddress &&
          `${doctor.clinicAddress}${doctor.clinicCity ? `, ${doctor.clinicCity}` : ""}${
            doctor.clinicState ? `, ${doctor.clinicState}` : ""
          }, Việt Nam`,
        doctor.clinicAddress,
        doctor.clinicCity && `${doctor.clinicCity}, Việt Nam`,
      ]
        .filter(Boolean)
        .map((addr) => addr!.trim()) as string[];

      for (const address of addressCandidates) {
        const result = await fallbackGeocodeAddress(address);
        if (result) {
          coordinatesCacheRef.current.set(cacheKey, result);
          return result;
        }
      }

      console.warn("Unable to geocode coordinates for doctor:", doctor.fullName);
      return null;
    },
    [getDoctorCacheKey, fallbackGeocodeAddress]
  );

  // Helper function to add doctor markers
  const createMarkerElement = useCallback((color: string) => {
    const el = document.createElement("div");
    el.className = "rounded-full shadow-lg border-2 border-white";
    el.style.backgroundColor = color;
    el.style.width = "16px";
    el.style.height = "16px";
    return el;
  }, []);

  const addDoctorMarkers = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    popupsRef.current.forEach((popup) => popup.remove());
    popupsRef.current.clear();

    const selectedDoctorId = selectedDoctor ? getDoctorCacheKey(selectedDoctor) : null;

    for (const doctor of doctors) {
      const doctorId = getDoctorCacheKey(doctor);
      const coords = await getDoctorCoordinates(doctor);

      if (!coords) {
        console.warn("Skipping doctor without coordinates:", doctor.fullName);
        continue;
      }

      const { lat, lng } = coords;
      const isSelected = selectedDoctorId === doctorId;

      const marker = new maplibregl.Marker({
        element: createMarkerElement(isSelected ? "#2563eb" : "#3b82f6"),
      })
        .setLngLat([lng, lat])
        .addTo(map);

      const popup = new maplibregl.Popup({ closeButton: false, offset: 12 }).setHTML(createInfoWindowContent(doctor));

      marker.getElement().addEventListener("click", () => {
        popupsRef.current.forEach((p) => p.remove());
        popup.addTo(map);
        onDoctorSelect(doctor);
        map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), essential: true });
      });

      marker.setPopup(popup);

      markersRef.current.set(doctorId, marker);
      popupsRef.current.set(doctorId, popup);
    }

    if (!selectedDoctor && doctors.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      markersRef.current.forEach((marker) => {
        bounds.extend(marker.getLngLat());
      });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [doctors, selectedDoctor, onDoctorSelect, getDoctorCoordinates, getDoctorCacheKey, createMarkerElement]);

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    if (userLocation) {
      addUserMarker(userLocation);
    }

    void addDoctorMarkers();
  }, [isMapReady, userLocation, addDoctorMarkers, addUserMarker]);

  // Update user marker when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) {
      return;
    }

    addUserMarker(userLocation);
  }, [userLocation, addUserMarker]);

  // Refresh doctor markers when data changes
  useEffect(() => {
    if (mapInstanceRef.current && isMapReady) {
      void addDoctorMarkers();
    }
  }, [doctors, isMapReady, addDoctorMarkers]);

  // Handle selected doctor change
  useEffect(() => {
    let isCancelled = false;

    const handleSelectedDoctor = async () => {
      if (!selectedDoctor || !mapInstanceRef.current) return;

      const coords = await getDoctorCoordinates(selectedDoctor);
      if (!coords || isCancelled) return;

      const { lat, lng } = coords;

      popupsRef.current.forEach((popup) => popup.remove());

      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: Math.max(mapInstanceRef.current.getZoom(), 15),
        essential: true,
      });

      const doctorId = getDoctorCacheKey(selectedDoctor);
      const popup = popupsRef.current.get(doctorId);
      if (popup) {
        popup.addTo(mapInstanceRef.current);
      }
    };

    void handleSelectedDoctor();

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor, getDoctorCoordinates, getDoctorCacheKey]);

  const addUserMarker = useCallback((location: { lat: number; lng: number }) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLngLat([location.lng, location.lat]);
      return;
    }

    const marker = new maplibregl.Marker({
      element: (() => {
        const el = document.createElement("div");
        el.className = "rounded-full shadow-lg border-2 border-white bg-red-500";
        el.style.width = "16px";
        el.style.height = "16px";
        return el;
      })(),
    })
      .setLngLat([location.lng, location.lat])
      .addTo(map);

    marker.getElement().setAttribute("title", "Vị trí của bạn");

    userMarkerRef.current = marker;
  }, []);

  const showDirections = useCallback(async () => {
    if (!selectedDoctor || !userLocation) return;

    const coords = await getDoctorCoordinates(selectedDoctor);
    if (!coords) return;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${coords.lat},${coords.lng}&travelmode=driving`;
    window.open(url, "_blank");
  }, [selectedDoctor, userLocation, getDoctorCoordinates]);

  const createInfoWindowContent = (doctor: Doctor): string => {
    return `
      <div style="padding: 12px; max-width: 280px;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
          ${doctor.fullName}
        </h3>
        <p style="margin: 4px 0; font-size: 14px; color: #2563eb; font-weight: 500;">
          ${doctor.specialty || doctor.specialization || ""}
        </p>
        ${
          doctor.clinicName
            ? `
          <p style="margin: 4px 0; font-size: 13px; color: #4b5563;">
            <strong>🏥 ${doctor.clinicName}</strong>
          </p>
        `
            : ""
        }
        ${
          doctor.clinicAddress
            ? `
          <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">
            📍 ${doctor.clinicAddress}
          </p>
        `
            : ""
        }
        ${
          doctor.consultationFee
            ? `
          <p style="margin: 8px 0 4px 0; font-size: 14px; color: #059669; font-weight: 600;">
            💰 ${doctor.consultationFee.toLocaleString()} VNĐ/buổi
          </p>
        `
            : ""
        }
        ${
          doctor.rating
            ? `
          <p style="margin: 4px 0; font-size: 12px; color: #f59e0b;">
            ⭐ ${doctor.rating} ${doctor.reviewCount ? `(${doctor.reviewCount} đánh giá)` : ""}
          </p>
        `
            : ""
        }
      </div>
    `;
  };

  // Loading state
  if (!isMapReady && !error) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải bản đồ...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full h-full bg-red-50 flex items-center justify-center">
        <div className="text-center text-red-600 p-6">
          <p className="font-semibold mb-2">Lỗi tải bản đồ</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const canRequestLocation =
    typeof window !== "undefined" && typeof navigator !== "undefined" && "geolocation" in navigator;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 flex flex-col gap-3 max-w-xs">
        {canRequestLocation && !userLocation && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <h4 className="font-semibold text-sm mb-2">Cần vị trí của bạn?</h4>
            <p className="text-xs text-gray-500 mb-3">
              Cho phép truy cập vị trí để xem khoảng cách và chỉ đường từ nơi bạn đang đứng.
            </p>
            <button
              onClick={() => requestUserLocation()}
              disabled={isRequestingLocation}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              {isRequestingLocation ? "Đang lấy vị trí..." : "Sử dụng vị trí của tôi"}
            </button>
            {locationError && <p className="text-xs text-red-500 mt-2">{locationError}</p>}
          </div>
        )}

        {selectedDoctor && userLocation && (
          <div className="bg-white rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">{selectedDoctor.fullName}</h4>
            </div>

            <button
              onClick={() => void showDirections()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              <Navigation className="w-4 h-4" />
              Chỉ đường trên Google Maps
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
