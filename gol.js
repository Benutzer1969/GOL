/*
 * 2020-12-16: Create / Updated BL by Dieter Jäger
 */
var playTimer;

var c;
var ctx;
var cs;
var ctxs;

var numx;
var numy;

var wasserstand; 	// Wert zwischen 1 (Flut) und 0 (Ebbe)
var zoom; 			// Wert für die Skalierung: größer = zoom in
var deckung; 		// Anfangsdichte der Siedlungen: 1: alles voll, 0: niemand da

var bgfarbe;
var wasserfarbe;
var zellenfarbe;

var overlayScale = 10;
var overlayDaempfung = 5;

var pinselgroesse;
var paint = 0;
var paintZiel;
var paintWert;

var w;					// Breite einer Zelle
var h;					// Höhe einer Zelle

var isDown = false;

// Wasserflächen-Array
var seen = [];
var seenOverlay = [];

// Zellen-Array
var sf = [];

window.onload = function(){
	
	// Werte aus der UI einlesen
	wasserstand = uiWasserstand.value;
	zoom = uiZoom.value;
	wasserfarbe = uiWasserfarbe.value;
	zellenfarbe = uiZellenfarbe.value;
	bgfarbe = uiBgfarbe.value;
	pinsel = uiPinsel.value;
	uiPinselInput.value = uiPinsel.value;
	deckung = uiDensity.value;
	pinselgroesse = uiPinsel.value;
	overlayScale = uiOverlayScale.value;
	overlayDaempfung = uiOverlayDaempfung.value;
	
	// Was soll gemalt werden?
	var radios = document.getElementsByName('paint');
	
	
	document.body.style.backgroundColor = bgfarbe;
	
	// Status Linke Maustaste 
	document.body.onmousedown = function(){
		isDown = true;
	}
	document.body.onmouseup = function(){
		isDown = false;
		clearInterval ( playTimer );
	}
	start.onmousedown = function(){
		clearInterval ( playTimer );
		playTimer = setInterval ( iteration, 100 );
	}
	start.onmouseup = function(){
		clearInterval ( playTimer );
	}	
	step.onclick = function(){
		iteration();
	}
	zurueck.onclick = function(){
		zuruecksetzen();
	}
	neu.onclick = function(){
		
		noise.newMap();
		noise.seed();
		// Werte aus der UI einlesen
		wasserstand = uiWasserstand.value;
		zoom = uiZoom.value;
		wasserfarbe = uiWasserfarbe.value;
		zellenfarbe = uiZellenfarbe.value;
		bgfarbe = uiBgfarbe.value;	
	
		seenZuruecksetzen();
	}
	uiClear.onclick = function(){
		sf = [];
		for ( var i = 0; i < numy; i++ ){
			sf.push ( [] );
			for ( var j = 0; j < numx; j++ ){
				sf[i].push( false );
			}
		}
		draw();
	}
	uiZoom.onchange = function(){
		// Werte aus der UI einlesen
		zoom = uiZoom.value;
	
		seenZuruecksetzen();
	}
	uiDensity.onchange = function(){
		deckung = this.value;
		seenZuruecksetzen();
	}
	uiOverlayScale.onchange = function(){
		overlayScale = this.value;
		seenZuruecksetzen();
	}
	uiOverlayDaempfung.onchange = function(){
		overlayDaempfung = this.value;
		seenZuruecksetzen();
	}
	uiZellen.oninput = function(){
		uiZellenInput.value = uiZellen.value;
	}
	uiZellen.onchange = function(){
		// Werte aus der UI einlesen
		numx = uiZellen.value;
		numy = Math.ceil( numx / ( c.width / c.height ) );
		
		//debug.innerHTML = numx;
		uiZellenInput.value = numx;
		
		w = c.width / numx;
		h = c.height / numy;
	
		seenZuruecksetzen();
	}
	uiZellenInput.onchange = function(){
		uiZellen.value = uiZellenInput.value;
		
		// Werte aus der UI einlesen
		
		numx = uiZellen.value;
		numy = Math.ceil( numx / ( c.width / c.height ) );
				
		w = c.width / numx;
		h = c.height / numy;
	
		seenZuruecksetzen();
		
	}
	uiPinsel.oninput = function(){
		// Werte aus der UI einlesen
		pinsel = uiPinsel.value;
		pinselgroesse = uiPinsel.value;
		
		uiPinselInput.value = pinsel;
		
	}
	uiPinselInput.oninput = function(){
		uiPinsel.value = uiPinselInput.value;
		
		pinsel = uiPinsel.value;
		pinselgroesse = uiPinsel.value;
	}
	uiWasserstand.onchange = function(){
		// Werte aus der UI einlesen
		wasserstand = uiWasserstand.value;
	
		seenZuruecksetzen();
	}
	uiWasserfarbe.onchange = function(){
		// Werte aus der UI einlesen
		wasserfarbe = uiWasserfarbe.value;
		
		draw();
	}
	uiZellenfarbe.onchange = function(){
		// Werte aus der UI einlesen
		zellenfarbe = uiZellenfarbe.value;
		
		draw();
	}
	uiBgfarbe.onchange = function(){
		// Werte aus der UI einlesen
		bgfarbe = uiBgfarbe.value;
		
		document.body.style.backgroundColor = bgfarbe;
	}
	
	for( var i = 0; i < radios.length; i++ ){
		radios[i].onclick = function(){
			paint = this.index;
			
			if ( paint == 0){
				paintZiel = sf;
				paintWert = true;
			} else if ( paint == 1 ){
				paintZiel = sf;
				paintWert = false;
			} else if ( paint == 2 ){
				paintZiel = seen;
				paintWert = true;
			} else if ( paint == 3 ){
				paintZiel = seen;
				paintWert = false;
			}
		}
	}
	
	// Auf dem Canvas zeichnen
	karte.onmousemove = function(event){
		var rect = this.getBoundingClientRect();
		var s = Math.max(document.documentElement.scrollTop,document.body.scrollTop);
		
		posx = Math.floor((event.pageX - rect.left) / w);
		posy = Math.floor((event.pageY - (rect.top + s)) / h);
		//debug.innerHTML = posx + ', ' + posy;
		//console.log(posx + ', ' + posy );
		if(isDown){
			for ( var i = pinsel/2; i > (0-pinsel/2); i-- ){
				for ( var j = pinsel/2; j > (0-pinsel/2); j-- ){
					if ( posx+Math.floor(j) >= 0 && posy+Math.floor(i) >= 0 && posx+Math.floor(j) < numx && posy+Math.floor(i) < numy ){
						if( paint > 1 || !seen[posy+Math.floor(i)][posx+Math.floor(j)] ){
							paintZiel[posy+Math.floor(i)][posx+Math.floor(j)] = paintWert;
						}
					}
				}
			}
			
			
			draw();
			drawSeen();
		}
	}
	
	
	c = document.getElementById('spielfeld');
	ctx = c.getContext('2d');
	
	cs = document.getElementById('seenplatte');
	ctxs = cs.getContext('2d');
	
	ctx.fillStyle = '#864';
	ctxs.fillStyle = '#864';
	
	uiZellenInput.value = uiZellen.value;
	numx = uiZellen.value;
	numy = numx / ( c.width / c.height );
	
	w = c.width / numx;
	h = c.height / numy;
	
	seenZuruecksetzen();
	
	// Was soll gemalt werden?
	for(var i = 0; i<radios.length; i++ ){
		radios[i].index = i;	// Den Index des Radiobuttons hier ablegen
		if ( radios[i].checked ){
			
			paint = i;
			
			if ( paint == 0){
				paintZiel = sf;
				paintWert = true;
			} else if ( paint == 1 ){
				paintZiel = sf;
				paintWert = false;
			} else if ( paint == 2 ){
				paintZiel = seen;
				paintWert = true;
			} else if ( paint == 3 ){
				paintZiel = seen;
				paintWert = false;
			}
		}
	}
}

function draw(){
	ctx.clearRect(0,0,c.width,c.height);
	
	// Zellen zeichnen
	ctx.fillStyle = zellenfarbe;
	//ctx.beginPath();
	for ( var i = 0; i < numy; i++ ){
		for ( var j = 0; j < numx; j++ ){
			if ( isTrue(j, i) ){
				ctx.fillRect ( j*w, i*h, w, h );
			}
		}
	}
	//ctx.fill();
}
function drawSeen(){
	ctxs.clearRect(0,0,c.width,c.height);
	
	// Wasserflächen zeichnen
	ctxs.fillStyle = wasserfarbe;
	ctxs.beginPath();
	for ( var i = 0; i < numy; i++ ){
		for ( var j = 0; j < numx; j++ ){
			if ( seen[i][j] ){
				ctxs.rect ( j*w, i*h, w, h );
			}
		}
	}
	ctxs.fill();
	/*
	if ( paint == 0){
		paintZiel = sf;
		paintWert = true;
	} else if ( paint == 1 ){
		paintZiel = sf;
		paintWert = false;
	} else if ( paint == 2 ){
		paintZiel = seen;
		paintWert = true;
	} else if ( paint == 3 ){
		paintZiel = seen;
		paintWert = false;
	}
	*/
}

function iteration(){
	var temp = [];
	for ( var i = 0; i < numy; i++ ){
		temp.push ( [] );
		
		for ( var j = 0; j < numx; j++ ){
			
			if ( seen[i][j] ){
				temp[i].push ( false );
			} else {
				var num = 0;
								
				var isWater = false;
				for ( var k = -1; k <= 1; k++ ){
					for ( var l = -1; l <= 1; l++ ){
						if(k==0 && l==0){
							
						} else if ( (j + k) < 0 || (i + l) < 0 || (j + k) >= numx || (i+l) >= numy ){
							
						} else {
							if ( sf[i+l][j+k] ){
								num++;
							}
							if ( seen[i+l][j+k] ){
								isWater = true;
							}
						} 
					}
				}
	
				
				if ( isWater ){
					if ( sf[i][j] && ( num == 2 || num == 3 || num == 4 )){
						temp[i].push ( true );
					} else if ( !sf[i][j] && ( num == 2 || num == 3 ) ){
						temp[i].push ( true );
					} else {
						temp[i].push ( false );
					}
				} else {
					if ( sf[i][j] && ( num == 2 || num == 3 )){
						temp[i].push ( true );
					} else if ( !sf[i][j] && num == 3 ){
						temp[i].push ( true );
					} else {
						temp[i].push ( false );
					}
				}
			}
		}
	}
	
	sf = temp.slice(0);
	draw();
}

function isTrue(x, y){
	if ( x < 0 || y < 0 || x >= numx || y >= numy ){
		return false;
	} else if ( sf[y][x] ){
		return true;
	} else {
		return false;
	}
}
function isSeeTrue(x, y){
	if ( x < 0 || y < 0 || x >= numx || y >= numy ){
		return false;
	} else if ( seen[y][x] ){
		return true;
	} else {
		return false;
	}
}

function zuruecksetzen(){
	// Zellen generieren
	sf = [];
	for ( var i = 0; i < numy; i++ ){
		sf.push ( [] );
		for ( var j = 0; j < numx; j++ ){
			if ( seen[i][j] ){
				sf[i].push( false );
			} else {
				sf[i].push (  Math.random() > (1 - deckung) );
			}
		}
	}
	draw();
}

function seenZuruecksetzen(){
	
	seen = [];
	for ( var i = 0; i < numy; i++ ){
		seen.push ( [] );
		for ( var j = 0; j < numx; j++ ){
			seen[i].push ( ( noise.perlin2(j * zoom / numx, i * zoom /numy) ));
		}
	}
	
	
	noise2.newMap();
	noise2.seed();
	
	seenOverlay = [];
	for ( var i = 0; i < numy; i++ ){
		seenOverlay.push ( [] );
		for ( var j = 0; j < numx; j++ ){
			var val = ( noise.perlin2(j * zoom * overlayScale / numx, i * zoom * overlayScale /numy) );
			seen[i][j] = (seen[i][j] + (val / overlayDaempfung)) > ( 1-wasserstand )
			//seenOverlay[i].push ( ( noise.perlin2(j * zoom * overlayScale / numx, i * zoom * overlayScale /numy) ) > ( 1-wasserstand ) );
		}
	}
	
	
	drawSeen();
	zuruecksetzen();
}
