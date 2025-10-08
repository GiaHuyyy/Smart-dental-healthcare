/**
 * Script to update doctor addresses with detailed Vietnamese information and precise coordinates.
 * This script uses a hardcoded map for accuracy, ensuring data consistency.
 * Run: node scripts/update-doctor-addresses.js
 */

const fetch = require('node-fetch');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';

/**
 * Normalizes an address string for robust comparison.
 * It converts to lowercase, removes diacritics (accents), standardizes terms,
 * and removes extra punctuation and whitespace.
 * @param {string} str The address string to normalize.
 * @returns {string} The normalized address.
 */
function normalizeAddress(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        // Remove diacritics (e.g., á -> a)
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        // Special case for Vietnamese 'đ'
        .replace(/đ/g, "d")
        // Standardize abbreviations
        .replace(/tp\.?\s*hcm/g, 'thanh pho ho chi minh')
        .replace(/q\.?/g, 'quan')
        .replace(/p\.?/g, 'phuong')
        // Remove punctuation and collapse whitespace
        .replace(/[.,]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}


// A structured array to map old address variations to a new, standardized Vietnamese address.
const addressUpdates = [
    // --- District 1 ---
    {
        aliases: [
            '123 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
            '123 Đường Lê Lợi, Quận 1, TP.HCM',
            '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
            'Le Loi Street, District 1, Ho Chi Minh City', // Added from log
        ],
        newAddress: '123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7756,
        longitude: 106.7009,
    },
    {
        aliases: [
            'Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
            '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
            '456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
            'Nguyen Hue Walking Street, District 1, Ho Chi Minh City', // Added from log
        ],
        newAddress: '456 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7743,
        longitude: 106.7019,
    },
    {
        aliases: [
            'Cống Quỳnh, Quận 1, TP. Hồ Chí Minh',
            '321 Đường Cống Quỳnh, Quận 1, TP.HCM',
            '321 Đường Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
            'Cong Quynh Street, District 1, Ho Chi Minh City', // Added from log
        ],
        newAddress: '321 Đường Cống Quỳnh, Phường Phạm Ngũ Lão, Quận 1, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7649,
        longitude: 106.6914,
    },
    // --- District 3 ---
    {
        aliases: [
            '789 Hai Bà Trưng, Quận 3, TP. Hồ Chí Minh',
            '789 Đường Hai Bà Trưng, Quận 3, TP.HCM',
            '789 Đường Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
            'Hai Ba Trung Street, District 3, Ho Chi Minh City', // Added from log
        ],
        newAddress: '789 Đường Hai Bà Trưng, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7823,
        longitude: 106.6876,
    },
    {
        aliases: [
            'Pasteur, Quận 3, TP. Hồ Chí Minh',
            '654 Đường Pasteur, Quận 3, TP.HCM',
            '654 Đường Pasteur, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
            'Pasteur Street, District 3, Ho Chi Minh City', // Added from log
        ],
        newAddress: '654 Đường Pasteur, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7788,
        longitude: 106.6945,
    },
    {
        aliases: [
            'Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
            '987 Đường Võ Thị Sáu, Quận 3, TP.HCM',
            '987 Đường Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
            'Vo Thi Sau Street, District 3, Ho Chi Minh City', // Added from log
        ],
        newAddress: '987 Đường Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7825,
        longitude: 106.6918,
    },
    // --- Binh Thanh District ---
    {
        aliases: [
            '147 Điện Biên Phủ, Quận Bình Thạnh, TP. Hồ Chí Minh',
            '147 Đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM',
            '147 Đường Điện Biên Phủ, Phường 15, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam',
            'Dien Bien Phu Street, Binh Thanh District, Ho Chi Minh City', // Added from log
        ],
        newAddress: '147 Đường Điện Biên Phủ, Phường 15, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.8012,
        longitude: 106.7038,
    },
    {
        aliases: [
            '258 Xô Viết Nghệ Tĩnh, Quận Bình Thạnh, TP. Hồ Chí Minh',
            '258 Đường Xô Viết Nghệ Tĩnh, Quận Bình Thạnh, TP.HCM',
            '258 Đường Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam',
            'Xo Viet Nghe Tinh Street, Binh Thanh District, Ho Chi Minh City', // Added from log
        ],
        newAddress: '258 Đường Xô Viết Nghệ Tĩnh, Phường 21, Quận Bình Thạnh, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.8024,
        longitude: 106.7111,
    },
    // --- District 10 ---
    {
        aliases: [
            '369 Lý Thường Kiệt, Quận 10, TP. Hồ Chí Minh',
            '369 Đường Lý Thường Kiệt, Quận 10, TP.HCM',
            '369 Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành phố Hồ Chí Minh, Việt Nam',
            'Ly Thuong Kiet Street, District 10, Ho Chi Minh City', // Added from log
        ],
        newAddress: '369 Đường Lý Thường Kiệt, Phường 14, Quận 10, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7725,
        longitude: 106.6669,
    },
    {
        aliases: [
            '741 Sư Vạn Hạnh, Quận 10, TP. Hồ Chí Minh',
            '741 Đường Sư Vạn Hạnh, Quận 10, TP.HCM',
            '741 Đường Sư Vạn Hạnh, Phường 12, Quận 10, Thành phố Hồ Chí Minh, Việt Nam',
            'Su Van Hanh Street, District 10, Ho Chi Minh City', // Added from log
        ],
        newAddress: '741 Đường Sư Vạn Hạnh, Phường 12, Quận 10, Thành phố Hồ Chí Minh, Việt Nam',
        latitude: 10.7711,
        longitude: 106.6632,
    },
    // --- Phan Thiet - Binh Thuan ---
    {
        aliases: [
            'Trần Hưng Đạo, Phan Thiết, Bình Thuận',
            '286A Trần Hưng Đạo, Bình Hưng, Thành phố Phan Thiết, Bình Thuận, Việt Nam',
            'Tran Hung Dao Street, Phan Thiet, Binh Thuan', // Added from log
        ],
        newAddress: '286A Trần Hưng Đạo, Phường Bình Hưng, Thành phố Phan Thiết, Bình Thuận, Việt Nam',
        latitude: 10.9269,
        longitude: 108.1013,
    },
];

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
        const response = await fetch(`${BACKEND_URL}/api/v1/users`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
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
        console.error(`❌ Error updating doctor:`, error.message);
        return null;
    }
}

async function main() {
    console.log('📝 Updating doctor addresses with detailed Vietnamese information...\n');
    const doctors = await getAllDoctors();
    console.log(`📋 Found ${doctors.length} doctors\n`);

    let updated = 0;
    let skipped = 0;

    for (const doctor of doctors) {
        const currentAddress = doctor.address?.trim();

        if (!currentAddress) {
            console.log(`⏭️  Skipping ${doctor.fullName} - No address`);
            skipped++;
            continue;
        }

        const normalizedCurrentAddress = normalizeAddress(currentAddress);

        // Find the correct update object by checking if the normalized current address
        // matches any of the normalized aliases.
        const updateData = addressUpdates.find(update =>
            update.aliases.some(alias => normalizeAddress(alias) === normalizedCurrentAddress)
        );

        if (updateData) {
            console.log(`\n🔄 Updating: ${doctor.fullName}`);
            console.log(`   Old: ${currentAddress}`);
            console.log(`   New: ${updateData.newAddress}`);
            console.log(`   📍 Coordinates: ${updateData.latitude}, ${updateData.longitude}`);

            const result = await updateDoctor(doctor._id || doctor.id, {
                address: updateData.newAddress,
                latitude: updateData.latitude,
                longitude: updateData.longitude,
            });

            if (result) {
                console.log(`   ✅ Updated successfully`);
                updated++;
            } else {
                console.log(`   ❌ Failed to update`);
            }
        } else {
            console.log(`⏭️  ${doctor.fullName} - Address not in mapping`);
            // For debugging, print the address that was not found
            console.log(`   - DB Address: "${currentAddress}"`);
            skipped++;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📝 Total: ${doctors.length}`);
    console.log('='.repeat(50));
    console.log('\n✅ All done! Addresses have been standardized.');
    console.log('🗺️  Next: Open the map in your app to see doctor locations!\n');
}

main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

