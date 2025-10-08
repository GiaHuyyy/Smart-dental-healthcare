import { NextRequest, NextResponse } from "next/server";

async function queryOpenStreetMap(address: string, signal?: AbortSignal) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept-Language": "vi,en",
      "User-Agent": "smart-dental-healthcare/1.0 (contact: support@smartdental.vn)",
      Accept: "application/json",
    },
    signal,
    // Respect Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`OSM request failed with status ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name?: string;
  }>;

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const result = data[0];
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    displayName: result.display_name,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("q")?.trim();

  if (!address) {
    return NextResponse.json({ error: "Thiếu tham số q" }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const result = await queryOpenStreetMap(address, controller.signal);
      clearTimeout(timeout);

      if (!result) {
        return NextResponse.json({ error: "Không tìm thấy tọa độ" }, { status: 404 });
      }

      return NextResponse.json(result);
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  } catch (error) {
    console.error("Server geocode error:", error);
    const status = error instanceof Error && error.name === "AbortError" ? 504 : 500;
    return NextResponse.json(
      {
        error: "Không thể tra cứu tọa độ",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status }
    );
  }
}
