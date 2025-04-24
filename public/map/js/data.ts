import { kdTree as KDTree } from 'kd-tree-javascript/kdTree.js';
import * as points from './points';
import * as projection from './projection';
import * as wind from './wind';

export interface WeatherData {
    current: {
        temperature2m: number;
        windSpeed10m: number;
        windDirection10m: number;
    };
    location: {
        latitude: number;
        longitude: number;
        timezoneAbbreviation: string | null;
    };
    computed: {
        opacity: string;
        color: string;
        pixelPos?: { x: number; y: number };
    };
    x?: number;
    y?: number;
    z?: number;
}

// Function to load weather data from a static JSON file
async function loadWeatherDataFromFile(filePath: string): Promise<WeatherData[] | null> {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            console.error(`Error fetching weather data file ${filePath}: ${response.status} ${response.statusText}`);
            return null;
        }
        // Assuming the file contains the structure { timestamp: number, data: WeatherData[] }
        // similar to the old cache format.
        const cachedObject = await response.json(); 
        if (!cachedObject || !cachedObject.data) {
            console.error(`Invalid data structure in ${filePath}. Expected { timestamp: number, data: WeatherData[] }`);
            return null;
        }
        const data: WeatherData[] = cachedObject.data;

        console.log(`Successfully loaded ${data.length} weather data points from ${filePath}.`);
        return data;
    } catch (error) {
        console.error(`Error loading or parsing weather data file ${filePath}:`, error);
        return null;
    }
}

export let globalWeatherDataCollection: WeatherData[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
export let weatherDataTree: KDTree | null = null;
let coordinateConverter: ReturnType<typeof projection.createCoordinateConverter> | null = null;

declare global {
    interface Window {
        resizeTimer: ReturnType<typeof setTimeout>;
    }
}

window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
        redrawAllArrows();
        setupTooltip();
    }, 200);
});

document.addEventListener('DOMContentLoaded', async function() {
    canvas = document.getElementById('arrow-canvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Could not get 2D context from canvas!");
        return;
    }

    wind.initializeWindLayer();

    const staticDataPath = '/map/assets/weather_data_cache.json';
    const loadedData = await loadWeatherDataFromFile(staticDataPath);

    if (loadedData) {
        globalWeatherDataCollection = loadedData;

        // Add computed 3D coordinates (x, y, z) required for KDTree
        globalWeatherDataCollection.forEach(weatherData => {
            if (!weatherData.location) {
                console.warn("Skipping data point with missing location:", weatherData);
                return; // Skip this data point if location is missing
            }
            const latRad = weatherData.location.latitude * Math.PI / 180;
            const lonRad = weatherData.location.longitude * Math.PI / 180;
            const R = 1;
            weatherData.x = R * Math.cos(latRad) * Math.cos(lonRad);
            weatherData.y = R * Math.cos(latRad) * Math.sin(lonRad);
            weatherData.z = R * Math.sin(latRad);
        });

        weatherDataTree = buildWeatherDataTree();
        if (weatherDataTree) {
            console.log("KDTree built successfully from static file.");
            redrawAllArrows(); 
            startWindAnimation();
        } else {
            console.error("Failed to build KDTree from static file data.");
        }
    } else {
        // Handle failure to load static data
        console.error(`Failed to load weather data from ${staticDataPath}. Cannot initialize map features.`);
        // Optionally display a message to the user on the page
        const mapElement = document.getElementById('world-map');
        if (mapElement) {
            mapElement.innerHTML = `<p style="color: red; text-align: center; margin-top: 50px;">Error: Could not load essential weather data.</p>`;
        }
        return; // Stop execution if data loading failed
    }

    // Store the converter for use in event listeners
    coordinateConverter = projection.createCoordinateConverter(canvas.width, canvas.height);

    // Setup tooltip interaction
    setupTooltip();
});

function drawArrowOnCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rotationDegrees: number,
    opacity: number,
    color: string
) {
    const size = 4;
    const angleRad = rotationDegrees * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angleRad);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(-size, -size);
    ctx.lineTo(0, 0);
    ctx.lineTo(-size, size);
    ctx.stroke();
    ctx.restore();
}

function buildWeatherDataTree(): KDTree | null {
    if (globalWeatherDataCollection.length === 0 || !globalWeatherDataCollection[0].hasOwnProperty('x')) {
        console.log("Cannot build weather data tree: no data points available or missing x,y,z coords.");
        return null;
    }

    function distance(a: wind.WindParticle | WeatherData, b: WeatherData): number {
        const lat1 = a?.location?.latitude;
        const lon1 = a?.location?.longitude;
        const lat2 = b?.location?.latitude;
        const lon2 = b?.location?.longitude;

        // Convert degrees to radians
        const latRad1 = lat1 * Math.PI / 180;
        const lonRad1 = lon1 * Math.PI / 180;
        const latRad2 = lat2 * Math.PI / 180;
        const lonRad2 = lon2 * Math.PI / 180;

        // Convert to 3D Cartesian coordinates (unit sphere R=1)
        const x1 = Math.cos(latRad1) * Math.cos(lonRad1);
        const y1 = Math.cos(latRad1) * Math.sin(lonRad1);
        const z1 = Math.sin(latRad1);

        const x2 = Math.cos(latRad2) * Math.cos(lonRad2);
        const y2 = Math.cos(latRad2) * Math.sin(lonRad2);
        const z2 = Math.sin(latRad2);

        // Calculate Euclidean distance (chord length) in 3D space
        const dx = x1 - x2;
        const dy = y1 - y2;
        const dz = z1 - z2;
        const chordDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Return the chord distance
        return chordDistance;
    }

    console.log("Building KDTree with geographic distance metric and data:", globalWeatherDataCollection);

    weatherDataTree = new KDTree(
        globalWeatherDataCollection,
        distance,
        ['x', 'y', 'z']
    );
	console.log("KDTree built with data:", weatherDataTree);
	return weatherDataTree;
}

function redrawAllArrows() {
    if (!canvas || !ctx) return;

    const worldMap = document.querySelector('#world-map');
    if (!worldMap) return;

    const mapRect = worldMap.getBoundingClientRect();
    canvas.width = mapRect.width;
    canvas.height = mapRect.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const converter = projection.createCoordinateConverter(canvas.width, canvas.height);
    globalWeatherDataCollection.forEach(weatherData => {
        const { location, current, computed } = weatherData;
        const pixelPos = converter.geoToPixel(location.latitude, location.longitude);
        drawArrowOnCanvas(
            ctx!,
            pixelPos.x,
            pixelPos.y,
            current.windDirection10m,
            parseFloat(computed.opacity),
            computed.color
        );	
    });
    projection.updateScaleBar();
}

function computeBorderColor(temperature2m: number): string {
    let r, g, b;
    const tempCapped = Math.max(-15, Math.min(30, temperature2m));

    if (tempCapped >= 15) {
        const tempScaler = (tempCapped - 15) / 15;
        r = 255;
        g = Math.round(255 * (1 - tempScaler));
        b = Math.round(255 * (1 - tempScaler));
    } else {
        const tempScaler = (tempCapped + 15) / 30;
        r = Math.round(255 * tempScaler);
        g = Math.round(255 * tempScaler);
        b = 255;
    }
    return `rgb(${r}, ${g}, ${b})`;
}

const ticksPerSecond = 30;
let lastDataUpdateTime = 0;

function animateWindParticles() {
    const now = Date.now();
    const elapsed = now - lastDataUpdateTime;

    if (elapsed >= 1000 / ticksPerSecond) {
        wind.redrawWindParticles(elapsed);
        lastDataUpdateTime = now;
    }

    requestAnimationFrame(animateWindParticles);
}

function startWindAnimation() {
    lastDataUpdateTime = Date.now();
    animateWindParticles();
}

// --- Tooltip Logic ---

function setupTooltip() {
    const mapElement = document.getElementById('world-map');
    const tooltipElement = document.getElementById('tooltip');

    if (!mapElement || !tooltipElement || !coordinateConverter) {
        console.error("Map, tooltip, or coordinate converter not available for tooltip setup.");
        return;
    }

    mapElement.addEventListener('mousemove', (event) => {
        if (!weatherDataTree) return; // Don't do anything if tree isn't ready

        const rect = (event.target as Element).getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Convert pixel to geo
        const geoCoords = coordinateConverter!.pixelToGeo(mouseX, mouseY);

        if (!geoCoords) { // Mouse might be off the projected map
            tooltipElement.style.display = 'none';
            return;
        }

        const { latitude, longitude } = geoCoords;

        // Convert geo to x, y, z for KDTree query
        const latRad = latitude * Math.PI / 180;
        const lonRad = longitude * Math.PI / 180;
        const R = 1;
        const queryPoint = {
            x: R * Math.cos(latRad) * Math.cos(lonRad),
            y: R * Math.cos(latRad) * Math.sin(lonRad),
            z: R * Math.sin(latRad),
            // Add dummy location/current if needed by distance function, 
            // though the KDTree uses x,y,z primarily
            location: { latitude, longitude }, 
            current: { temperature2m: 0, windSpeed10m: 0, windDirection10m: 0 },
            computed: { opacity: '0', color: ''} // Add dummy computed if necessary
        };

        // Find nearest weather data point using the KDTree
        const nearestResult = weatherDataTree.nearest(queryPoint, 1);
        if (nearestResult && nearestResult.length > 0) {
            const [nearestData, distance] = nearestResult[0]; // nearestData is WeatherData
            
            // Format the data for the tooltip
            const temp = nearestData.current.temperature2m.toFixed(1);
            const wind = nearestData.current.windSpeed10m.toFixed(1);
            tooltipElement.innerHTML = `Temp: ${temp}°C\nWind: ${wind} m/s`;

            // Position tooltip near cursor
            // Adjust offsetX/offsetY to prevent tooltip from covering the cursor
            const offsetX = 15;
            const offsetY = 10;
            tooltipElement.style.left = `${event.pageX + offsetX}px`;
            tooltipElement.style.top = `${event.pageY + offsetY}px`;
            tooltipElement.style.display = 'block';
        } else {
            tooltipElement.style.display = 'none';
        }
    });

    mapElement.addEventListener('mouseout', () => {
        tooltipElement.style.display = 'none';
    });

    console.log("Tooltip interactions initialized.");
}