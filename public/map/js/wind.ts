import * as projection from './projection';
import { weatherDataTree } from './data';

export interface WindParticle {
	current: {
		temperature2m: number;
		windSpeed10m: number;
		windDirection10m: number;
	};

	location: {
		latitude: number;
		longitude: number;
	};

	computed: {
		opacity: number;
		color: string;
		tail: {latitude: number, longitude: number}[];
		pixelX?: number; 
        pixelY?: number; 
	};

    x?: number;
    y?: number;
    z?: number;
}

declare global {
    interface Window {
        hasLoggedMissingTree?: boolean;
    }
}

let windParticles: WindParticle[] = [];
let windCanvas: HTMLCanvasElement | null = null;
let windCtx: CanvasRenderingContext2D | null = null;
const DEG_TO_RAD = Math.PI / 180;
const PARTICLE_RESPAWN_FRACTION = 0.02;
const MAX_TAIL_LENGTH = 10; 

export function initializeWindLayer() {
	windCanvas = document.getElementById('wind-canvas') as HTMLCanvasElement;
	if (!windCanvas) {
		console.error("Wind canvas element not found!");
		return;
	}
	windCtx = windCanvas.getContext('2d');
	if (!windCtx) {
		console.error("Could not get 2D context from wind canvas!");
		return;
	}
	
	createWindParticles(50000, windParticles);
	
	console.log("Wind layer initialized with", windParticles.length, "particles");
}

function createWindParticles(count: number, windParticles: WindParticle[]) {
	for (let i = 0; i < count; i++) {
		windParticles.push({
			location: {
				// Global bounds: latitude -90 to 90, longitude -180 to 180
				latitude: Math.random() * 180 - 90,
				longitude: Math.random() * 360 - 180,
			},
			current: {
				temperature2m: 0,
				windSpeed10m: 0,
				windDirection10m: 0,
			},
			computed: {
				opacity: 0.5,
				color: 'rgba(255, 255, 255, 0.5)',
				tail: []
			}
		});
	}
}

export function redrawWindParticles(elapsed: number) {
	if (!windCanvas || !windCtx) {
		console.warn("Wind canvas or context not initialized, skipping redraw.");
		return;
	}

	if (!weatherDataTree) {
		if (!window.hasLoggedMissingTree) {
			console.warn("Weather data tree not available, skipping wind particle redraw.");
			window.hasLoggedMissingTree = true;
		}
		windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
		return;
	}

	const worldMap = document.querySelector('#world-map');
	if (!worldMap) return;

	const mapRect = worldMap.getBoundingClientRect();
	// Check if dimensions changed before resizing and clearing - might save some work
    if (windCanvas.width !== mapRect.width || windCanvas.height !== mapRect.height) {
        windCanvas.width = mapRect.width;
        windCanvas.height = mapRect.height;
    }
	windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
	const converter = projection.createCoordinateConverter(windCanvas.width, windCanvas.height);
	const scaledElapsed = elapsed * 15; // Scale time factor once

    // --- Particle Respawning (outside the loop) ---
    const numToRespaw = Math.floor(windParticles.length * PARTICLE_RESPAWN_FRACTION);
    if (numToRespaw > 0) {
        windParticles.splice(0, numToRespaw); // Remove oldest particles
        createWindParticles(numToRespaw, windParticles); // Add new ones
    }
    // --- End Particle Respawning ---


	windParticles.forEach((particle) => {

        // Calculate particle's current 3D position for KDTree search
        const currentLatRad = particle.location.latitude * DEG_TO_RAD; // Use constant
        const currentLonRad = particle.location.longitude * DEG_TO_RAD; // Use constant
        const R = 1; // Unit sphere
        particle.x = R * Math.cos(currentLatRad) * Math.cos(currentLonRad);
        particle.y = R * Math.cos(currentLatRad) * Math.sin(currentLonRad);
        particle.z = R * Math.sin(currentLatRad);

        // Find nearest weather data point using the X,Y,Z based tree
		let nearest = weatherDataTree!.nearest(particle, 1);
        if (!nearest || nearest.length === 0) {
            return; // Skip if no data found
        }
		let [point, distance] = nearest[0]; // point is a WeatherData object

        // --- Update particle properties based on the nearest point ---
        const blendFactor = 0.05; // Adjust for faster/slower adaptation
        particle.current.windSpeed10m += (point.current.windSpeed10m - particle.current.windSpeed10m) * blendFactor;
        
        // Smoother angle interpolation (handle wrap-around)
        let angleDiff = point.current.windDirection10m - particle.current.windDirection10m;
        while (angleDiff <= -180) angleDiff += 360;
        while (angleDiff > 180) angleDiff -= 360;
        particle.current.windDirection10m += angleDiff * blendFactor;
        particle.current.windDirection10m = (particle.current.windDirection10m + 360) % 360; 

		particle.computed.color = point.computed.color;
		particle.computed.opacity = parseFloat(point.computed.opacity); // Ensure opacity is a number

        // Convert wind speed (m/s) to approximate degrees latitude per ms
        // Scaled elapsed time is used here
        const speedDegPerMs = particle.current.windSpeed10m / 111000 * scaledElapsed; 

        // Convert meteorological wind direction to radians
        const meteoDirectionRad = particle.current.windDirection10m * DEG_TO_RAD; // Use constant

        // Calculate V (Northward) and U (Eastward) components in degrees/ms
        const vComponentDeg = speedDegPerMs * (-Math.cos(meteoDirectionRad));
        const uComponentDeg = speedDegPerMs * (Math.sin(meteoDirectionRad));

        // Calculate displacement in degrees
        const deltaLat = vComponentDeg;
        const lonScale = Math.cos(currentLatRad);
        const deltaLon = lonScale > 0.01 ? (uComponentDeg / lonScale) : 0;

        // --- Store previous pixel location for tail ---
        const prevPixelX = particle.computed.pixelX;
        const prevPixelY = particle.computed.pixelY;

        // Update particle location
        particle.location.latitude += deltaLat;
        particle.location.longitude += deltaLon;

		// Wrap around the planet
		let wrapped = false;
        if (particle.location.latitude > 90) {
            particle.location.latitude = 180 - particle.location.latitude;
            particle.location.longitude += 180;
			wrapped = true;
        } else if (particle.location.latitude < -90) {
            particle.location.latitude = -180 - particle.location.latitude;
            particle.location.longitude += 180;
			wrapped = true;
        }
		if (particle.location.longitude > 180) {
			particle.location.longitude -= 360;
			wrapped = true;
		} else if (particle.location.longitude < -180) {
			particle.location.longitude += 360;
			wrapped = true;
		}

		// --- Calculate new pixel position ONCE ---
		const newPixelLocation = converter.geoToPixel(particle.location.latitude, particle.location.longitude);
        particle.computed.pixelX = newPixelLocation.x;
        particle.computed.pixelY = newPixelLocation.y;

        // --- Tail Management ---
        if (wrapped) {
            particle.computed.tail = []; // Reset tail on wrap
        } else {
             // Add previous *geo* coords to tail - needed if map resizes
            particle.computed.tail.push({
                latitude: particle.location.latitude - deltaLat, // Approx previous geo
                longitude: particle.location.longitude - deltaLon // Approx previous geo
            });
            if (particle.computed.tail.length > MAX_TAIL_LENGTH) {
                particle.computed.tail.shift(); // Still using shift for now
            }
        }

		// --- Draw Tail ---
        if (particle.computed.tail.length > 1 && !wrapped && prevPixelX !== undefined && prevPixelY !== undefined) {
            windCtx!.beginPath();
            windCtx!.moveTo(prevPixelX, prevPixelY); 
            windCtx!.lineTo(particle.computed.pixelX!, particle.computed.pixelY!); 

            for (let i = particle.computed.tail.length - 2; i >= 0; i--) {
                const tailPixel = converter.geoToPixel(particle.computed.tail[i].latitude, particle.computed.tail[i].longitude);
                windCtx!.lineTo(tailPixel.x, tailPixel.y);
            }
            
            windCtx!.strokeStyle = particle.computed.color; 
            windCtx!.globalAlpha = 0.3; // Fainter tail
            windCtx!.lineWidth = 1;
            windCtx!.stroke();
        }
        

		// --- Draw Particle Head ---
		drawDotOnCanvas(windCtx!, particle.computed.pixelX!, particle.computed.pixelY!, particle.computed.opacity, particle.computed.color);

    });
}

function drawDotOnCanvas(ctx: CanvasRenderingContext2D, x: number, y: number, opacity: number, color: string) {
	ctx.fillStyle = color;
	ctx.globalAlpha = opacity;
	
	const screenWidth = window.innerWidth;
	const screenHeight = window.innerHeight;
	const screenSize = Math.min(screenWidth, screenHeight);
	
	let size = 1;
	
	if (screenSize >= 768) {
		size = 3;
	} else if (screenSize >= 480) {
		size = 2;
	}

	const halfSize = size / 2;
	
	ctx.fillRect(
		Math.floor(x - halfSize), 
		Math.floor(y - halfSize), 
		size, 
		size
	);
}

export function clearWindLayer() {
	if (windCtx && windCanvas) {
		windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);
	}
	windParticles = [];
	console.log("Wind layer cleared.");
}
