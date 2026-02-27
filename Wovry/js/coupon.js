/**
 * Coupon Code System
 * Hardcoded coupons for now. Later connect to Firestore `coupons` collection.
 */

const COUPONS = {
    'WELCOME10': { type: 'percent', value: 10, minOrder: 500, description: '10% off on orders above ₹500' },
    'FLAT200': { type: 'flat', value: 200, minOrder: 1500, description: '₹200 off on orders above ₹1500' },
    'FIRSTORDER': { type: 'percent', value: 15, minOrder: 1000, description: '15% off on your first order above ₹1000' },
};

/**
 * @param {string} code
 * @param {number} subtotal
 * @returns {{ valid: boolean, discount: number, message: string }}
 */
export function applyCoupon(code, subtotal) {
    const coupon = COUPONS[code.toUpperCase().trim()];

    if (!coupon) {
        return { valid: false, discount: 0, message: 'Invalid coupon code.' };
    }

    if (subtotal < coupon.minOrder) {
        return { valid: false, discount: 0, message: `Minimum order of ₹${coupon.minOrder} required for this coupon.` };
    }

    let discount = 0;
    if (coupon.type === 'percent') {
        discount = Math.round(subtotal * (coupon.value / 100));
    } else if (coupon.type === 'flat') {
        discount = coupon.value;
    }

    // Cap discount at subtotal
    discount = Math.min(discount, subtotal);

    return {
        valid: true,
        discount,
        message: `Coupon applied! You saved ₹${discount.toFixed(2)}.`,
    };
}

/**
 * Calculate shipping cost
 * Free above ₹2000, ₹99 flat below
 */
export function calculateShipping(subtotal) {
    if (subtotal >= 2000) return { cost: 0, message: 'Free Shipping!' };
    return { cost: 99, message: 'Flat ₹99 shipping (Free above ₹2000)' };
}

/**
 * Estimate delivery based on pincode
 */
export function estimateDelivery(pincode) {
    if (!pincode || pincode.length !== 6) {
        return { days: null, message: 'Enter a valid 6-digit pincode' };
    }

    const pin = parseInt(pincode);
    // Metro cities pincodes (simplified ranges)
    const metroRanges = [
        [110001, 110099], // Delhi
        [400001, 400099], // Mumbai
        [560001, 560099], // Bangalore
        [600001, 600099], // Chennai
        [700001, 700099], // Kolkata
        [500001, 500099], // Hyderabad
        [411001, 411099], // Pune
    ];

    const isMetro = metroRanges.some(([min, max]) => pin >= min && pin <= max);

    if (isMetro) {
        return { days: '3-5', message: 'Estimated delivery: 3-5 business days' };
    }
    return { days: '5-8', message: 'Estimated delivery: 5-8 business days' };
}
