document.addEventListener("DOMContentLoaded",function(){let e=document.getElementById("world-map");function t(t){let a=new Image;if(a.src=t,a.id="world-map",a.alt="8-bit world map",a.classList.add("pixelated"),e.parentNode.replaceChild(a,e),!document.querySelector("style.pixelated-style")){let e=document.createElement("style");e.className="pixelated-style",e.textContent=`
                .pixelated {
                    image-rendering: pixelated;
                    image-rendering: -moz-crisp-edges;
                    image-rendering: crisp-edges;
                }
            `,document.head.appendChild(e)}}e.onload=function(){let a=localStorage.getItem("pixelatedWorldMap");if(a)return void t(a);let d=document.createElement("canvas"),l=d.getContext("2d");d.width=e.naturalWidth,d.height=e.naturalHeight,l.drawImage(e,0,0);let i=l.getImageData(0,0,d.width,d.height).data,o=l.createImageData(d.width,d.height),n=o.data;for(let e=0;e<d.height;e+=7)for(let t=0;t<d.width;t+=7){let a=Math.min(t+Math.floor(3.5),d.width-1),l=(Math.min(e+Math.floor(3.5),d.height-1)*d.width+a)*4,o=i[l],r=i[l+1],h=i[l+2],m=i[l+3],g=(o+r+h)/3,c=m>50&&g<240;for(let a=0;a<7&&e+a<d.height;a++)for(let l=0;l<7&&t+l<d.width;l++){let i=((e+a)*d.width+(t+l))*4;c?(n[i]=o,n[i+1]=r,n[i+2]=h,n[i+3]=255):(n[i]=0,n[i+1]=0,n[i+2]=0,n[i+3]=0)}}l.putImageData(o,0,0);let r=d.toDataURL();localStorage.setItem("pixelatedWorldMap",r),t(r)},e.complete&&e.onload()});
//# sourceMappingURL=map.196bab38.js.map
