import { fetchWeatherApi } from 'openmeteo';
import generateGlobalGrid from './points';
import { geoToPixel, createCoordinateConverter, updateScaleBar } from './projection'

const CACHE_KEY = 'weatherDataCache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

interface WeatherData {
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
		borderColor: string;
	};
}

let globalWeatherDataCollection: WeatherData[] = [];

declare global {
	interface Window {
		resizeTimer: ReturnType<typeof setTimeout>;
	}
}

window.addEventListener('resize', function() {
	document.querySelectorAll('.wind-arrow').forEach(arrow => arrow.remove());
	
	clearTimeout(window.resizeTimer);
	window.resizeTimer = setTimeout(function() {
		processCachedData();
	}, 200);
});

document.addEventListener('DOMContentLoaded', function() {
	const useCache = isDevMode() && hasCachedData();
	if (useCache) {
		processCachedData();
	} else {
		const { latitudes, longitudes } = generateGlobalGrid(4000);
		globalWeatherDataCollection = [];
		processBatches(latitudes, longitudes, 100);
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
		return !isExpired;
	} catch (e) {
		console.error("Error parsing cached data:", e);
		return false;
	}
}

function processCachedData() {
	try {
		const cachedData = localStorage.getItem(CACHE_KEY);
		if (!cachedData) return;
		
		const { data } = JSON.parse(cachedData);
		
		const loadingText = document.querySelector('.loading-text');
		if (!loadingText) return;
		
		data.forEach((weatherData, index) => {
			const { location, current, computed } = weatherData;
			const arrow = newArrow(location.latitude, location.longitude);
			if (arrow) {
				arrow.dataset.direction = current.windDirection10m.toString();
				arrow.style.setProperty('--direction', `${current.windDirection10m}deg`);
				arrow.style.transform = `rotate(${current.windDirection10m}deg)`;
				arrow.style.opacity = computed.opacity;
				arrow.style.borderColor = computed.borderColor;
			}
			
			// Update loading text
			loadingText.textContent = `Loading ${index + 1} out of ${data.length} points`;
		});
		
		// Clear the text instead of removing the element
		loadingText.textContent = '';
	
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
		
		updateScaleBar();
		
		if (batch < batches - 1) {
			await new Promise(resolve => setTimeout(resolve, 10000));
		}
	}
	
	if (isDevMode()) {
		localStorage.setItem(CACHE_KEY, JSON.stringify({
			timestamp: Date.now(),
			data: globalWeatherDataCollection
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
	
	const batchWeatherData: WeatherData[] = [];

	for (let i = 0; i < responses.length; i++) {
		const response = responses[i];

		const timezoneAbbreviation = response.timezoneAbbreviation();
		const latitude = response.latitude();
		const longitude = response.longitude();

		const current = response.current()!;
		const temperature2m = current.variables(0)!.value();
		const windSpeed10m = current.variables(1)!.value();
		const windDirection10m = current.variables(2)!.value();
		const weatherData = {
			current: {
				temperature2m: temperature2m,
				windSpeed10m: windSpeed10m,
				windDirection10m: windDirection10m,
			},
			location: {
				latitude,
				longitude,
				timezoneAbbreviation
			},
			computed: {
				opacity: (windSpeed10m / 15).toString(),
				borderColor: computeBorderColor(temperature2m)
			}
		};
		
		batchWeatherData.push(weatherData);
		globalWeatherDataCollection.push(weatherData);

		const arrow = newArrow(latitude, longitude);
		if (arrow) {
			arrow.dataset.direction = windDirection10m.toString();
			arrow.style.setProperty('--direction', `${windDirection10m}deg`);
			arrow.style.transform = `rotate(${windDirection10m}deg)`;
			arrow.style.opacity = weatherData.computed.opacity;
			arrow.style.borderColor = weatherData.computed.borderColor;
		}
	}
}

function newArrow(latitude: number, longitude: number) {
	const arrow = document.createElement('i');
	arrow.id = `arrow-${latitude}-${longitude}`;
	arrow.className = 'arrow wind-arrow';
	arrow.dataset.lat = latitude.toString();
	arrow.dataset.lon = longitude.toString();
	const mapContainer = document.querySelector('.map-container');
	if (!mapContainer) return;
	
	const worldMap = document.querySelector('#world-map');
	if (!worldMap) return;
	
	const mapRect = worldMap.getBoundingClientRect();
	const converter = createCoordinateConverter(mapRect.width, mapRect.height);
	const pixelPos = converter.geoToPixel(latitude, longitude);
	
	arrow.style.left = `${pixelPos.x}px`;
	arrow.style.bottom = `${pixelPos.y}px`;
	arrow.style.position = 'absolute';
	
	mapContainer.appendChild(arrow);
	return document.getElementById(arrow.id);
}

function clearWeatherCache() {
	try {
		localStorage.removeItem(CACHE_KEY);
		console.log("Weather data cache cleared successfully");
		return true;
	} catch (e) {
		console.error("Error clearing weather data cache:", e);
		return false;
	}
}

// Helper function for computing border color
function computeBorderColor(temperature2m: number): string {
	if (temperature2m >= 15) {
		const tempScaler = (temperature2m - 15) / 15;
		const redValue = 255;
		const greenBlueValue = 255 - (tempScaler * 255);
		return `rgb(${redValue}, ${greenBlueValue}, ${greenBlueValue})`;
	} else {
		const tempScaler = (temperature2m - 15) / -15;
		const blueValue = 255;
		const redGreenValue = 255 - (tempScaler * 255);
		return `rgb(${redGreenValue}, ${redGreenValue}, ${blueValue})`;
	}
}