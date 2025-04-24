document.addEventListener('DOMContentLoaded', function() {
    const img = document.getElementById('world-map');
    
    img.onload = function() {
        // Check if we have a cached version
        const cachedImage = localStorage.getItem('pixelatedWorldMap');
        if (cachedImage) {
            replaceWithPixelatedImage(cachedImage);
            return;
        }

        // If no cached version, process the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const pixelSize = 7;
        
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const pixelatedImageData = ctx.createImageData(canvas.width, canvas.height);
        const pixelatedData = pixelatedImageData.data;
        
        for (let y = 0; y < canvas.height; y += pixelSize) {
            for (let x = 0; x < canvas.width; x += pixelSize) {
                const sampleX = Math.min(x + Math.floor(pixelSize / 2), canvas.width - 1);
                const sampleY = Math.min(y + Math.floor(pixelSize / 2), canvas.height - 1);
                const sampleIndex = (sampleY * canvas.width + sampleX) * 4;
                
                const r = data[sampleIndex];
                const g = data[sampleIndex + 1];
                const b = data[sampleIndex + 2];
                const a = data[sampleIndex + 3];
                
                const threshold = 50;
                const brightness = (r + g + b) / 3;
                const isVisible = a > threshold && brightness < 240;
                
                for (let py = 0; py < pixelSize && y + py < canvas.height; py++) {
                    for (let px = 0; px < pixelSize && x + px < canvas.width; px++) {
                        const index = ((y + py) * canvas.width + (x + px)) * 4;
                        
                        if (isVisible) {
                            pixelatedData[index] = r;
                            pixelatedData[index + 1] = g;
                            pixelatedData[index + 2] = b;
                            pixelatedData[index + 3] = 255;
                        } else {
                            pixelatedData[index] = 0;
                            pixelatedData[index + 1] = 0;
                            pixelatedData[index + 2] = 0;
                            pixelatedData[index + 3] = 0;
                        }
                    }
                }
            }
        }
        
        ctx.putImageData(pixelatedImageData, 0, 0);
        
        // Cache the processed image
        const dataUrl = canvas.toDataURL();
        localStorage.setItem('pixelatedWorldMap', dataUrl);
        
        // Replace the image
        replaceWithPixelatedImage(dataUrl);
    };
    
    // Helper function to replace the original image
    function replaceWithPixelatedImage(dataUrl) {
        const pixelatedImage = new Image();
        pixelatedImage.src = dataUrl;
        pixelatedImage.id = 'world-map';
        pixelatedImage.alt = '8-bit world map';
        pixelatedImage.classList.add('pixelated');
        
        img.parentNode.replaceChild(pixelatedImage, img);
        
        // Add pixelated styling if not already present
        if (!document.querySelector('style.pixelated-style')) {
            const style = document.createElement('style');
            style.className = 'pixelated-style';
            style.textContent = `
                .pixelated {
                    image-rendering: pixelated;
                    image-rendering: -moz-crisp-edges;
                    image-rendering: crisp-edges;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    if (img.complete) {
        img.onload();
    }
});
