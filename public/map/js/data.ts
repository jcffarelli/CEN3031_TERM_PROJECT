import { kdTree as KDTree } from 'kd-tree-javascript/kdTree.js';
import { fetchWeatherApi } from 'openmeteo';
import * as points from './points';
import * as projection from './projection';
import * as wind from './wind';
import { geoDistance } from 'd3-geo';

const CACHE_KEY = 'weatherDataCache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

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

export let globalWeatherDataCollection: WeatherData[] = [];
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
export let weatherDataTree: KDTree | null = null;

declare global {
    interface Window {
        resizeTimer: ReturnType<typeof setTimeout>;
    }
}

window.addEventListener('resize', function() {
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
        redrawAllArrows();
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

    const useCache = isDevMode() && hasCachedData();
    if (useCache) {
        processCachedData();
        startWindAnimation();
    } else {
        const { latitudes, longitudes } = points.generateGlobalGrid(4900);
        globalWeatherDataCollection = [];
        await processBatches(latitudes, longitudes, 10);
        weatherDataTree = buildWeatherDataTree();
        startWindAnimation();
    }
});

(window as any).clearWeatherCache = clearWeatherCache;

function isDevMode() {
    return window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
}

function hasCachedData() {
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (!cachedData) return false;

    try {
        const { timestamp } = JSON.parse(cachedData);
        const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
        if (isExpired) {
            return false;
        }
        return true;
    } catch (e) {
        console.error("Error parsing cached data:", e);
        return false;
    }
}

function processCachedData() {
    if (!canvas || !ctx) return;
    try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (!cachedData) return;

        const { data } = JSON.parse(cachedData);
        globalWeatherDataCollection = data;
        console.log(`Loaded ${globalWeatherDataCollection.length} points from cache.`);

        globalWeatherDataCollection.forEach(weatherData => {
            const latRad = weatherData.location.latitude * Math.PI / 180;
            const lonRad = weatherData.location.longitude * Math.PI / 180;
            const R = 1;
            weatherData.x = R * Math.cos(latRad) * Math.cos(lonRad);
            weatherData.y = R * Math.cos(latRad) * Math.sin(lonRad);
            weatherData.z = R * Math.sin(latRad);
        });
        
        weatherDataTree = buildWeatherDataTree();
        
        if (weatherDataTree) {
            console.log("Successfully rebuilt KDTree from cached data with 3D coords.");
        } else {
            console.warn("Failed to rebuild KDTree from cached data.");
        }
        
        redrawAllArrows();
    } catch (e) {
        console.error("Error processing cached data:", e);
    }
}

async function processBatches(latitudes: Float32Array, longitudes: Float32Array, batchSize: number) {
    const totalPoints = latitudes.length;
    const batches = Math.ceil(totalPoints / batchSize);

    for (let batch = 0; batch < batches; batch++) {
        const start = batch * batchSize;
        const end = Math.min(start + batchSize, totalPoints);

        const batchLatitudes = latitudes.slice(start, end);
        const batchLongitudes = longitudes.slice(start, end);

        await fetchWeatherData(batchLatitudes, batchLongitudes);
        projection.updateScaleBar();

        if (batch < batches - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
        console.log(`Finished batch ${batch + 1} of ${batches}.`);
    }

    console.log(`Finished fetching all ${totalPoints} points.`);

    if (isDevMode()) {
        console.log("Caching weather data...");
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: globalWeatherDataCollection,
        }));
    }
}

async function fetchWeatherData(latitude: Float32Array, longitude: Float32Array) {
    const params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ["temperature_2m", "wind_speed_10m", "wind_direction_10m"],
        "models": "best_match"
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);

    for (let i = 0; i < responses.length; i++) {
        const response = responses[i];

        const timezoneAbbreviation = response.timezoneAbbreviation();
        const lat = response.latitude();
        const lon = response.longitude();

        const current = response.current()!;
        const temperature2m = current.variables(0)!.value();
        const windSpeed10m = current.variables(1)!.value();
        const windDirection10m = current.variables(2)!.value();

        const weatherData: WeatherData = {
            current: {
                temperature2m: temperature2m,
                windSpeed10m: windSpeed10m,
                windDirection10m: windDirection10m,
            },
            location: {
                latitude: lat,
                longitude: lon,
                timezoneAbbreviation
            },
            computed: {
                opacity: Math.min(1, windSpeed10m / 15).toString(),
                color: computeBorderColor(temperature2m)
            }
        };

        const latRad = weatherData.location.latitude * Math.PI / 180;
        const lonRad = weatherData.location.longitude * Math.PI / 180;
        const R = 1;
        weatherData.x = R * Math.cos(latRad) * Math.cos(lonRad);
        weatherData.y = R * Math.cos(latRad) * Math.sin(lonRad);
        weatherData.z = R * Math.sin(latRad);

        globalWeatherDataCollection.push(weatherData);
    }
}

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

function clearWeatherCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        globalWeatherDataCollection = [];
        weatherDataTree = null;
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        wind.clearWindLayer();
        console.log("Weather data cache cleared successfully");
        return true;
    } catch (e) {
        console.error("Error clearing weather data cache:", e);
        return false;
    }
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