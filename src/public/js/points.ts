function generateGlobalGrid(numPoints: number) {
    const latitudes = new Float32Array(numPoints);
    const longitudes = new Float32Array(numPoints);
    
    const phi = Math.PI * (3 - Math.sqrt(5));
    
    for (let i = 0; i < numPoints; i++) {
        const y = 1 - (i / (numPoints - 1)) * 2;
        
        const latitude = Math.asin(y) * (180 / Math.PI);
        
        const theta = phi * i;
        
        const longitude = ((theta % (2 * Math.PI)) * (180 / Math.PI)) - 180;
        
        latitudes[i] = latitude;
        longitudes[i] = longitude;
    }
    
    console.log(`Generated ${numPoints} points around the globe`);
    return { latitudes, longitudes };
}

export default generateGlobalGrid;