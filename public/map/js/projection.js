// --- Cached elements and converter ---
let cachedSvgElement = null;
let cachedScaleBarElement = null;
let cachedScaleTextElement = null;
let cachedConverter = null;
let cachedMapWidth = 0;
let cachedMapHeight = 0;
const EARTH_RADIUS_METERS = 6371000; // Define constant

function createCoordinateConverter(width, height) {
    // Only create a new projection if dimensions changed
    if (cachedConverter && cachedMapWidth === width && cachedMapHeight === height) {
        return cachedConverter;
    }

    console.log(`Creating new projection for ${width}x${height}`); // Log when it happens
    const projection = d3.geoMercator()
    // const projection = d3.geoRobinson()
        .scale(width / (2 * Math.PI))
        .translate([width / 2, height / 2]);

    const converter = {
        pixelToGeo: function(x, y) {
            const [longitude, latitude] = projection.invert([x, y]);
            return { latitude, longitude };
        },
        geoToPixel: function(latitude, longitude) {
            const [x, y] = projection([longitude, latitude]);
            return { x, y };
        }
    };

    // Cache the new converter and dimensions
    cachedConverter = converter;
    cachedMapWidth = width;
    cachedMapHeight = height;
    return converter;
}

/**
 * Calculates the real-world distance represented by a horizontal line
 * of a given pixel length at a specific Y-coordinate on the projected map.
 *
 * @param {number} barPixelLength - The desired visual length of the scale bar in pixels.
 * @param {number} scaleBarY - The vertical pixel coordinate for the center of the scale bar.
 * @param {number} mapWidth - The current width of the map container in pixels.
 * @param {number} mapHeight - The current height of the map container in pixels.
 * @param {object} converter - The coordinate converter object from createCoordinateConverter.
 * @returns {number} The calculated real-world distance in meters.
 */
function calculateRealDistanceForPixelLength(barPixelLength, scaleBarY, mapWidth, mapHeight, converter) {
    // Define the start and end X pixel coordinates for the bar, centered horizontally
    const startX = (mapWidth / 2) - (barPixelLength / 2);
    const endX = (mapWidth / 2) + (barPixelLength / 2);

    // Convert these screen pixel points back to geographical coordinates
    const geoStart = converter.pixelToGeo(startX, scaleBarY);
    const geoEnd = converter.pixelToGeo(endX, scaleBarY);

    // Ensure the conversion was successful (points might be off the globe)
    if (!geoStart || !geoEnd || isNaN(geoStart.latitude) || isNaN(geoEnd.latitude)) {
        console.warn("Scale bar position is off the projected map.");
        // Fallback or return 0
        return 0;
    }

    // Calculate the great-circle distance between these two geographical points using d3
    // d3.geoDistance returns radians; multiply by Earth radius in meters
    const geoDistanceRadians = d3.geoDistance(
        [geoStart.longitude, geoStart.latitude],
        [geoEnd.longitude, geoEnd.latitude]
    );

    const realDistanceMeters = geoDistanceRadians * EARTH_RADIUS_METERS;

    return realDistanceMeters;
}

function updateScaleBar() {
    // --- Use cached elements ---
    if (!cachedSvgElement) cachedSvgElement = document.querySelector('#world-map');
    if (!cachedScaleBarElement) cachedScaleBarElement = document.querySelector('.scale-bar');
    if (!cachedScaleTextElement) cachedScaleTextElement = document.querySelector('.scale-text');

    const svg = cachedSvgElement;
    const scaleBar = cachedScaleBarElement;
    const scaleText = cachedScaleTextElement;
    // --- End Use cached elements ---

    if (!svg || !scaleBar || !scaleText) {
        // If elements still not found after first attempt, maybe log warning or exit
        // console.warn("Scale bar elements not found."); 
        return;
    }

    const svgRect = svg.getBoundingClientRect();
    const mapWidth = svgRect.width;
    const mapHeight = svgRect.height;

    // --- Use cached converter if dimensions match ---
    const converter = createCoordinateConverter(mapWidth, mapHeight);
    // --- End Use cached converter ---

    // --- Define the scale bar properties ---
    const desiredBarPixelLength = 100; // Let the visual bar be 100 pixels wide
    // Position the scale bar vertically (e.g., 95% down the map)
    const scaleBarYPosition = mapHeight * 0.95;

    // Calculate the real-world distance this 100px bar represents at this Y position
    const realDistanceMeters = calculateRealDistanceForPixelLength(
        desiredBarPixelLength,
        scaleBarYPosition,
        mapWidth,
        mapHeight,
        converter
    );

    if (realDistanceMeters === 0) {
        // Handle cases where calculation failed (e.g., off-map)
        scaleText.textContent = "";
        scaleBar.style.width = `0px`;
        return;
    }

    // --- Update visual elements ---
    // Set the visual bar width
    scaleBar.style.width = `${desiredBarPixelLength}px`;
    // Position the bar (assuming CSS handles centering or absolute positioning)
    // Example CSS-based centering is often cleaner:
    // scaleBar.style.position = 'absolute';
    // scaleBar.style.left = '50%';
    // scaleBar.style.transform = 'translateX(-50%)'; // Center horizontally
    // scaleBar.style.bottom = `${mapHeight * 0.05}px`; // e.g., 5% from bottom


    // Format the text label to be user-friendly
    let displayValue;
    let displayUnit;

    if (realDistanceMeters >= 1000) {
        // Convert to kilometers and round appropriately
        const kilometers = realDistanceMeters / 1000;
        // Simple rounding for now, could be more sophisticated
        displayValue = Math.round(kilometers);
        displayUnit = "km";
    } else {
        // Keep in meters, perhaps round to nearest 10 or 50
        displayValue = Math.round(realDistanceMeters / 10) * 10; // Round to nearest 10m
        displayUnit = "m";
    }

    scaleText.textContent = `${displayValue} ${displayUnit}`;
    // Position the text (again, CSS is often preferred)
    // scaleText.style.position = 'absolute'; 
    // scaleText.style.left = scaleBar.style.left; 
    // scaleText.style.transform = scaleBar.style.transform; // Match bar centering
    // scaleText.style.bottom = `${parseFloat(scaleBar.style.bottom) + 15}px`; // Position above bar
}

// Add resize listener - consider debouncing/throttling if resize events fire rapidly
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(updateScaleBar, 100); // Debounce resize handler
});

// Initial update
document.addEventListener('DOMContentLoaded', () => {
    // Ensure elements are cached on load
    cachedSvgElement = document.querySelector('#world-map');
    cachedScaleBarElement = document.querySelector('.scale-bar');
    cachedScaleTextElement = document.querySelector('.scale-text');
    updateScaleBar(); // Run initial update
});

document.addEventListener('click', (event) => {
    // --- Use cached SVG element ---
    const svg = cachedSvgElement || document.querySelector('#world-map'); 
    if (!svg) return;

    const svgRect = svg.getBoundingClientRect();

    // Get click position relative to the map container
    const svgX = event.clientX - svgRect.left;
    const svgY = event.clientY - svgRect.top;

    // --- Reuse or create converter for current dimensions ---
    const converter = createCoordinateConverter(svgRect.width, svgRect.height);
    // --- End Reuse or create converter ---

    const geoCoords = converter.pixelToGeo(svgX, svgY);

    if (geoCoords && !isNaN(geoCoords.latitude)) {
     console.log(`click -> (${geoCoords.latitude.toFixed(3)}, ${geoCoords.longitude.toFixed(3)})`);
    } else {
     console.log("Clicked outside projected area.");
    }
});

export { createCoordinateConverter, updateScaleBar }; 