/**
 * AI Size Recommendation Engine
 * Rule-based for now. Replace recommendSize() with an ML model call later.
 * 
 * Usage:
 *   import { recommendSize } from './size-recommender.js';
 *   const size = recommendSize({ height: 170, weight: 70, bodyType: 'regular' });
 */

const SIZE_CHART = {
    XS: { minHeight: 0, maxHeight: 155, minWeight: 0, maxWeight: 50 },
    S: { minHeight: 150, maxHeight: 165, minWeight: 45, maxWeight: 60 },
    M: { minHeight: 160, maxHeight: 175, minWeight: 55, maxWeight: 75 },
    L: { minHeight: 170, maxHeight: 185, minWeight: 70, maxWeight: 90 },
    XL: { minHeight: 178, maxHeight: 999, minWeight: 85, maxWeight: 999 },
};

const BODY_TYPE_MODIFIER = {
    slim: -1,     // tends to need one size smaller
    regular: 0,
    broad: 1,     // tends to need one size larger
};

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

/**
 * Recommend a size based on body measurements.
 * @param {{ height: number, weight: number, bodyType: 'slim'|'regular'|'broad' }} params
 * @returns {{ size: string, confidence: string, measurements: object }}
 */
export function recommendSize({ height, weight, bodyType = 'regular' }) {
    // Score each size
    let bestSize = 'M';
    let bestScore = -Infinity;

    for (const [size, range] of Object.entries(SIZE_CHART)) {
        let score = 0;

        // Height scoring
        if (height >= range.minHeight && height <= range.maxHeight) {
            score += 2;
        } else {
            const distH = Math.min(Math.abs(height - range.minHeight), Math.abs(height - range.maxHeight));
            score -= distH * 0.05;
        }

        // Weight scoring
        if (weight >= range.minWeight && weight <= range.maxWeight) {
            score += 2;
        } else {
            const distW = Math.min(Math.abs(weight - range.minWeight), Math.abs(weight - range.maxWeight));
            score -= distW * 0.05;
        }

        if (score > bestScore) {
            bestScore = score;
            bestSize = size;
        }
    }

    // Apply body type modifier
    const modifier = BODY_TYPE_MODIFIER[bodyType] || 0;
    let idx = SIZE_ORDER.indexOf(bestSize) + modifier;
    idx = Math.max(0, Math.min(idx, SIZE_ORDER.length - 1));
    const finalSize = SIZE_ORDER[idx];

    // Confidence
    let confidence = 'High';
    if (bestScore < 2) confidence = 'Medium';
    if (bestScore < 0) confidence = 'Low';

    return {
        size: finalSize,
        confidence,
        measurements: SIZE_CHART[finalSize],
    };
}

/**
 * Renders the size recommendation modal HTML
 */
export function getSizeRecommenderModalHTML() {
    return `
    <div id="size-recommender-modal" class="fixed inset-0 z-50 hidden">
        <div class="absolute inset-0 bg-black bg-opacity-50" onclick="document.getElementById('size-recommender-modal').classList.add('hidden')"></div>
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl w-full max-w-md p-8">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold" style="font-family:'Playfair Display',serif">Find Your Perfect Size</h3>
                <button onclick="document.getElementById('size-recommender-modal').classList.add('hidden')" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <form id="size-recommender-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                    <input type="number" id="sr-height" min="100" max="220" placeholder="e.g., 170" required
                        class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                    <input type="number" id="sr-weight" min="30" max="200" placeholder="e.g., 65" required
                        class="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Body Type</label>
                    <div class="grid grid-cols-3 gap-3">
                        <label class="cursor-pointer">
                            <input type="radio" name="sr-bodytype" value="slim" class="sr-only peer">
                            <div class="text-center p-3 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 transition-all">
                                <i class="fas fa-person text-2xl mb-1"></i>
                                <p class="text-xs font-medium">Slim</p>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="sr-bodytype" value="regular" class="sr-only peer" checked>
                            <div class="text-center p-3 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 transition-all">
                                <i class="fas fa-person text-2xl mb-1"></i>
                                <p class="text-xs font-medium">Regular</p>
                            </div>
                        </label>
                        <label class="cursor-pointer">
                            <input type="radio" name="sr-bodytype" value="broad" class="sr-only peer">
                            <div class="text-center p-3 border-2 rounded-lg peer-checked:border-amber-600 peer-checked:bg-amber-50 transition-all">
                                <i class="fas fa-person text-2xl mb-1"></i>
                                <p class="text-xs font-medium">Broad</p>
                            </div>
                        </label>
                    </div>
                </div>
                <button type="submit" class="btn-primary w-full py-3 rounded-lg font-bold text-lg">
                    <i class="fas fa-magic mr-2"></i>Get Recommendation
                </button>
            </form>
            <div id="size-result" class="hidden mt-6 p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                <p class="text-sm text-gray-600 mb-1">We recommend</p>
                <p id="size-result-value" class="text-4xl font-bold text-green-700"></p>
                <p id="size-result-confidence" class="text-xs text-gray-500 mt-1"></p>
            </div>
        </div>
    </div>`;
}
