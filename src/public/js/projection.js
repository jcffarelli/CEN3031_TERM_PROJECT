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

export { createCoordinateConverter, geoToPixel }; 