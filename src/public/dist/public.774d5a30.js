document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("world-map");e.onload=function(){let t=document.createElement("canvas"),a=t.getContext("2d");t.width=e.naturalWidth,t.height=e.naturalHeight,a.drawImage(e,0,0);let d=a.getImageData(0,0,t.width,t.height).data,i=a.createImageData(t.width,t.height),n=i.data;for(let e=0;e<t.height;e+=7)for(let a=0;a<t.width;a+=7){let i=Math.min(a+Math.floor(3.5),t.width-1),l=(Math.min(e+Math.floor(3.5),t.height-1)*t.width+i)*4,o=d[l],h=d[l+1],r=d[l+2],g=d[l+3],m=(o+h+r)/3,c=g>50&&m<240;for(let d=0;d<7&&e+d<t.height;d++)for(let i=0;i<7&&a+i<t.width;i++){let l=((e+d)*t.width+(a+i))*4;c?(n[l]=o,n[l+1]=h,n[l+2]=r,n[l+3]=255):(n[l]=0,n[l+1]=0,n[l+2]=0,n[l+3]=0)}}a.putImageData(i,0,0);let l=new Image;l.src=t.toDataURL(),l.id="world-map",l.alt="8-bit world map",l.classList.add("pixelated"),e.parentNode.replaceChild(l,e);let o=document.createElement("style");o.textContent=`
            .pixelated {
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
            }
        `,document.head.appendChild(o)},e.complete&&e.onload()});
//# sourceMappingURL=public.774d5a30.js.map
