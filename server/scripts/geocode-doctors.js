/**
 * Improved geocoding script with better accuracy for Vietnamese addresses
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
const MAPTILER_API_KEY = '5wanY7xCE5xwWCDUivTY';
const MAPTILER_GEOCODING_URL = 'https://api.maptiler.com/geocoding';

const FORCE_UPDATE = true;

// Ngưỡng chấp nhận - điều chỉnh dựa trên kết quả thực tế
const MIN_RELEVANCE_FULL = 0.7;  // Địa chỉ đầy đủ
const MIN_RELEVANCE_NO_NUMBER = 0.65;  // Bỏ số nhà
const MIN_RELEVANCE_STREET_DISTRICT = 0.6;  // Đường + Quận
const MIN_RELEVANCE_DISTRICT = 0.55;  // Chỉ quận/huyện
const MIN_RELEVANCE_CITY = 0.45;  // City center (last resort)

async function geocodeAddress(address) {
  const cleanAddress = address.replace(/\n/g, " ").trim();

  const standardizedAddress = cleanAddress
    .replace(/\bTP\.?\s*HCM\b/gi, "Thành phố Hồ Chí Minh")
    .replace(/\bHCM\b/gi, "Thành phố Hồ Chí Minh");

  console.log(`   🔍 Trying geocoding strategies...`);

  // Chiến lược 1: Địa chỉ đầy đủ
  let result = await tryGeocode(standardizedAddress + ", Việt Nam");
  if (result) {
    console.log(`   📊 Strategy 1: Full address - relevance ${(result.relevance * 100).toFixed(1)}%`);
    if (result.relevance >= MIN_RELEVANCE_FULL) {
      console.log(`   ✅ ACCEPTED (full address)`);
      return result;
    }
  }

  // Chiến lược 2: Bỏ số nhà
  const noNumber = standardizedAddress.replace(/^\d+[A-Z]?\s+/, "");
  result = await tryGeocode(noNumber + ", Việt Nam");
  if (result) {
    console.log(`   📊 Strategy 2: Without number - relevance ${(result.relevance * 100).toFixed(1)}%`);
    if (result.relevance >= MIN_RELEVANCE_NO_NUMBER) {
      console.log(`   ✅ ACCEPTED (no street number)`);
      return result;
    }
  }

  // Chiến lược 3: Đường + Quận + Thành phố (bỏ phường)
  const parts = standardizedAddress.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    const streetDistrictCity = parts.slice(0, 1).concat(parts.slice(-2)).join(', ');
    result = await tryGeocode(streetDistrictCity + ", Việt Nam");
    if (result) {
      console.log(`   📊 Strategy 3: Street + District - relevance ${(result.relevance * 100).toFixed(1)}%`);
      if (result.relevance >= MIN_RELEVANCE_STREET_DISTRICT) {
        console.log(`   ✅ ACCEPTED (street + district)`);
        return result;
      }
    }
  }

  // Chiến lược 4: Quận + Thành phố với bounding box
  const isHCMC = /Thành phố Hồ Chí Minh/.test(standardizedAddress);
  if (isHCMC && parts.length >= 2) {
    const hcmcBoundingBox = [106.36, 10.36, 107.01, 11.12];
    const districtCity = parts.slice(-2).join(', ');
    result = await tryGeocode(districtCity + ", Việt Nam", hcmcBoundingBox);
    if (result) {
      console.log(`   📊 Strategy 4: District only - relevance ${(result.relevance * 100).toFixed(1)}%`);
      if (result.relevance >= MIN_RELEVANCE_DISTRICT) {
        console.log(`   ⚠️  ACCEPTED (district level only - approximate)`);
        return result;
      }
    }
  }

  // Chiến lược 5: City center (last resort cho HCMC)
  if (isHCMC) {
    result = await tryGeocode("Thành phố Hồ Chí Minh, Việt Nam");
    if (result) {
      console.log(`   📊 Strategy 5: City center - relevance ${(result.relevance * 100).toFixed(1)}%`);
      if (result.relevance >= MIN_RELEVANCE_CITY) {
        console.log(`   ⚠️  ACCEPTED (city center only - very approximate)`);
        return result;
      }
    }
  }

  console.log(`   ❌ All strategies failed - manual review needed`);
  return null;
}

async function tryGeocode(searchAddress, bbox = null) {
  let url = `${MAPTILER_GEOCODING_URL}/${encodeURIComponent(searchAddress)}.json?key=${MAPTILER_API_KEY}&language=vi&types=address,street,locality,poi&limit=1`;

  if (bbox) {
    url += `&bbox=${bbox.join(',')}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data?.features?.length) {
      const f = data.features[0];
      return {
        latitude: f.center[1],
        longitude: f.center[0],
        formatted_address: f.place_name,
        relevance: f.relevance || 0,
      };
    }
    return null;
  } catch (err) {
    console.error(`    ⚠️  Error geocoding "${searchAddress}":`, err.message);
    return null;
  }
}

async function getAllDoctors() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/users/doctors`);
    const data = await response.json();
    return data.data || data.users || data.results || [];
  } catch (error) {
    console.error('❌ Error fetching doctors:', error.message);
    return [];
  }
}

async function updateDoctor(doctorId, updates) {
  try {
    // FIX: Đảm bảo URL có dấu / đúng
    const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _id: doctorId,
        ...updates,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`❌ Error updating doctor ${doctorId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🗺️  Starting improved doctor address geocoding...\n');

  if (FORCE_UPDATE) {
    console.log('⚠️  FORCE_UPDATE = true → Will re-geocode all addresses\n');
  }

  const doctors = await getAllDoctors();
  console.log(`📋 Found ${doctors.length} doctors\n`);

  let geocoded = 0;
  let skipped = 0;
  let failed = 0;
  const failedAddresses = [];
  const approximateAddresses = [];

  for (const doctor of doctors) {
    if (!FORCE_UPDATE && doctor.latitude && doctor.longitude) {
      console.log(`⏭️  Skipping ${doctor.fullName} - Already has coordinates`);
      skipped++;
      continue;
    }

    if (!doctor.address) {
      console.log(`⏭️  Skipping ${doctor.fullName} - No address`);
      skipped++;
      continue;
    }

    console.log(`\n🔍 Geocoding: ${doctor.fullName}`);
    console.log(`   Address: ${doctor.address}`);

    const result = await geocodeAddress(doctor.address);

    if (result) {
      console.log(`   ✅ Coordinates: ${result.latitude}, ${result.longitude}`);
      console.log(`   📍 Formatted: ${result.formatted_address}`);

      const updated = await updateDoctor(doctor._id || doctor.id, {
        latitude: result.latitude,
        longitude: result.longitude,
      });

      if (updated) {
        console.log(`   💾 Updated in database`);
        geocoded++;

        // Track approximate locations
        if (result.relevance < MIN_RELEVANCE_STREET_DISTRICT) {
          approximateAddresses.push({
            name: doctor.fullName,
            address: doctor.address,
            relevance: result.relevance
          });
        }
      } else {
        console.log(`   ❌ Failed to update database`);
        failed++;
      }
    } else {
      console.log(`   ❌ Geocoding failed - needs manual review`);
      failedAddresses.push({
        name: doctor.fullName,
        address: doctor.address
      });
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log(`   ✅ Geocoded: ${geocoded}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total: ${doctors.length}`);

  if (approximateAddresses.length > 0) {
    console.log('\n⚠️  Approximate locations (district/city level):');
    approximateAddresses.forEach(item => {
      console.log(`   • ${item.name} (${(item.relevance * 100).toFixed(1)}%)`);
    });
  }

  if (failedAddresses.length > 0) {
    console.log('\n❌ Addresses that need manual review:');
    failedAddresses.forEach(item => {
      console.log(`   • ${item.name}: ${item.address}`);
    });
  }
  console.log('='.repeat(50) + '\n');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});