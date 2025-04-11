function createCoordinateConverter(width, height) {
    const projection = d3.geoRobinson()
        .scale(width / (2 * Math.PI))
        .translate([width / 2, height / 2]);
    
    function pixelToGeo(x, y) {
        const [longitude, latitude] = projection.invert([x, y]);
        
        return {
            latitude,
            longitude
        };
    }
    
    function geoToPixel(latitude, longitude) {
        const [x, y] = projection([longitude, latitude]);
        
        return {
            x,
            y
        };
    }
    
    return {
        pixelToGeo,
        geoToPixel
    };
}

function pixelsToMeters(px, width) {
    // Earth's circumference in meters
    const EARTH_CIRCUMFERENCE = 40075017;
    
    // Calculate the ratio of pixels to meters
    // The map width represents the Earth's circumference
    const metersPerPixel = EARTH_CIRCUMFERENCE / width;
    
    return px * metersPerPixel;
}

function updateScaleBar() {
    const svg = document.querySelector('#world-map');
    const scaleBar = document.querySelector('.scale-bar');
    const scaleText = document.querySelector('.scale-text');
    
    if (!svg || !scaleBar || !scaleText) return;
    
    const svgRect = svg.getBoundingClientRect();
    const meters = pixelsToMeters(100, svgRect.width);
    
    // Convert to km if over 1000m
    const displayValue = meters >= 1000 
        ? `${(meters / 1000).toFixed(2)} km`
        : `${meters.toFixed(2)} m`;
    
    scaleText.textContent = `${displayValue}`;
}

// Add resize listener
window.addEventListener('resize', updateScaleBar);

// Initial update
document.addEventListener('DOMContentLoaded', updateScaleBar);

document.addEventListener('click', (event) => {
    const svg = document.querySelector('#world-map');
    if (!svg) return;
    
    const svgRect = svg.getBoundingClientRect();
    
    const svgX = event.clientX
    const svgY = event.clientY
    
    const converter = createCoordinateConverter(svgRect.width, svgRect.height);
    const geoCoords = converter.pixelToGeo(svgX, svgY);
    console.log(`click -> (${geoCoords.latitude}, ${geoCoords.longitude})`);
});

export { createCoordinateConverter, geoToPixel, pixelsToMeters, updateScaleBar }; 