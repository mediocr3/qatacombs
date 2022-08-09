let canvas = document.getElementById("gameCanvas");
let counter = document.getElementById("counter");
let status = document.getElementById("status");
let thoughts = document.getElementById("thoughts");
let delveLevel = document.getElementById("delveLevel");
let delved;
let ctx = canvas.getContext("2d");
let toRender;
//let interval = 40;
let timeLived = 0.0;
let start; let prevTimestamp; let deltaTime = 0; let elapsed; let timeSinceDraw;
let lastSpawn = 0;
let bg; let sprites; let walls; let title;
let level;
let levelStart; let spawnRate;
let player;
let playing;

let game =
{
	res: 20,
	w: 32,
	h: 24,
	time: 0
};

function place(type)
{
	//if (type == 2) console.log("bing!"); if (type == 3) console.log("bong!");
	let locX = Math.floor(Math.random() * game.w); let locY = Math.floor(Math.random() * game.h);
	if (level[locY][locX] || Math.abs((locX * game.res + 10) - (player.x + 10)) < game.res * 6 && Math.abs((locY * game.res + 10) - (player.y + 10)) < game.res * 6) place(type);
	else level[locY][locX] = type;
}

function removeFromLevel(type)
{
	for (let r = 0; r < game.h; r++)
	{
		for (let c = 0; c < game.w; c++)
		{
			if (level[r][c] == type)
			{
				level[r][c] = 0;
				return;
			}
		}
	}
}

function findKey()
{
	removeFromLevel(3);
	place(2);
}

function digLevel(px, py)
{
	delved++;
	delveLevel.innerHTML = delved;
	level = Array(game.h).fill().map(() => Array(game.w))
	
	/* Levelcode 101!
	0 is empty space, 1 is wall, 2 is door, 3 is key
	4 is food, 5 is shield. That's it!
	*/
	for (let r = 0; r < game.h; r++)
	{
		for (let c = 0; c < game.w; c++)
		{
			if (r == py && (c == px || c == px + 1)) level [r][c] = 0; // make sure the player isn't stuck in or surrounded by a wall
			else if (Math.random() < .1) level[r][c] = 1;
			else level[r][c] = 0;
		}
	}
	
	// At first doors are locked behind doors every third level starting with the second. Starting on level 15, however, every door is locked.
	if (delved > 14 || delved % 3 == 2) place(3); // you have either a key or a door. once you collect a key, then it places a door.
	else place(2);
}


function isCollide(a, b) {
    return !(
        ((a.y + a.height) < (b.y)) ||
        (a.y > (b.y + b.height)) ||
        ((a.x + a.width) < b.x) ||
        (a.x > (b.x + b.width))
    );
}

function isCollide(a, ax, ay, bx, by, bw, bh)
{
	return !
	(
		(ay + a.height < by) ||
		(ay > by + bh) ||
		(ax + a.width < bx) ||
		(ax > bx + bw)
	);
}

function GameObject(x, y, w, h, c, s, ix, iy)
{
	this.x = x;
	this.y = y;
	this.width = w;
	this.height = h;
	this.color = c;
	this.imageX = ix;
	this.imageY = iy;
	this.speed = s;
	this.moveLeft = false;
	this.moveRight = false;
	this.moveUp = false;
	this.moveDown = false;
	this.moveX = 0;
	this.moveY = 0;
	this.render = function()
	{
		if (ix != null && iy != null)
		{
			ctx.drawImage(sprites, this.imageX, this.imageY, this.width, this.height, this.x, this.y, this.width, this.height);
			//ctx.drawImage(sprites, 0, 0, 20, 20, this.x, this.y, 20, 20);
		}
		else
		{
			ctx.fillStyle = this.color;
			ctx.fillRect(this.x, this.y, this.width, this.height);
		}
	}
	
	this.testCollision = function(dirX, dirY, target)
	{
		if (target == null) return this.testCollision(dirX, dirY, 1);
		else
		{
			let offsetX = this.x % 20; let offsetY = this.y % 20;
			let tileX = Math.floor(this.x / 20); let tileY = Math.floor(this.y / 20);
			let moveX = this.speed * dirX; let moveY = this.speed * dirY;
			let newTileX = tileX; let newTileY = tileY;
			if (offsetX + moveX < 0) newTileX -= 1; if (offsetX + 20 + moveX > 20) newTileX += 1;
			if (offsetY + moveY < 0) newTileY -= 1; if (offsetY + 20 + moveY > 20) newTileY += 1;
			newTileX = Math.min(32, Math.max(0, newTileX)); newTileY = Math.min(23, Math.max(0, newTileY));
			if (level[tileY][newTileX] == target || level[newTileY][tileX] == target || level[newTileY][newTileX] == target) return true;
			
			return false;
		}
	}
}

function Player()
{
	GameObject.call(this, 100, 100, 20, 20, "#991", 5, 0, 0);
	
	this.hunger = 100;
	this.grumble = function()
	{
		this.hunger--;
		if (this.hunger < 50) this.feel("hungry");
	}
	
	this.thoughts = 
	{
		beginning: {text: "I have finally decided to descend these horrible qatacombs! Wonder what these noises I am hearing are?", inMemory: false},
		frogs: {text: "Alas - a creature in these tunnels! It looks to be some sort of humanoid frog, but it does not look friendly! I do not want to be on the receiving end of that stick!", inMemory: false},
		doors: {text: "A door! Mayhaps that allow me to delve even further into these qatacombs strange?", inMemory: false},
		keys: {text: "Is that some sort of rusty key? I hope it still works!", inMemory: false}
	};
	this.think = function(thought)
	{
		thoughts.innerHTML = thought.text;
		thought.inMemory = true;
	}
	this.status = "fine";
	this.feel = function(feeling)
	{
		if (this.status != "hungry" && this.status != "starving") // hunger beats out all other emotions according to maslow's heirarchy of needs
			this.status = feeling;
		status.innerHTML = this.status;
	}
	
	this.eat = function()
	{
		this.hunger = Math.min(100, this.hunger + 50);
		if (this.hunger > 50) this.feel("fine");
		if (this.hunger > 90) this.feel("full");
	}
	
	this.calculateMovement = function()
	{
		this.moveX = this.moveY = 0; if (this.moveUp) this.moveY--; if (this.moveDown) this.moveY++; if (this.moveLeft) this.moveX--; if (this.moveRight) this.moveX++;
		if (this.x + this.moveX * this.speed < 0 || this.x + this.moveX * this.speed > canvas.width - 20) this.moveX = 0;
		if (this.y + this.moveY * this.speed < 0 || this.y + this.moveY * this.speed > canvas.height - 20) this.moveY = 0;
	}
	this.move = function() 
	{
		this.calculateMovement();
		if (!this.testCollision(this.moveX, 0)) this.x += this.speed * this.moveX;
		if (!this.testCollision(0, this.moveY)) this.y += this.speed * this.moveY;
		
		if (this.testCollision(this.moveX, this.moveY, 2)) setupLevel();
		if (this.testCollision(this.moveX, this.moveY, 3)) findKey();
	}
}

function Enemy(x, y)
{
	GameObject.call(this, x, y, game.res, game.res, "#902", 2, 0, 20);
	this.generateOffsets = function(min, max)
	{
		this.followOffsetX = Math.floor(Math.random() * (max - min)) + min;
		this.followOffsetY = Math.floor(Math.random() * (max - min)) + min;
	}
	this.generateOffsets(-80, 80);
	this.hasMoved = true;
	this.moveRatio = 0.2;
	this.oldHorDist = 0;
	this.oldVerDist = 0;
	this.move = function()
	{
		//this.followOffsetX = 40; this.followOffsetY = 0;
		let horDist = player.x - this.x + this.followOffsetX; //console.log("horizontal distance: ", Math.abs(horDist), "objective met", (Math.abs(horDist) <= 10));
		let verDist = player.y - this.y + this.followOffsetY; //console.log("vertical distance: ", Math.abs(verDist), "objective met", (Math.abs(verDist) <= 10));
		if (Math.abs(horDist) <= 10 && Math.abs(verDist) <= 10) this.generateOffsets(-40, 40);
		if (Math.abs(horDist) / Math.abs(verDist) > this.moveRatio)
		{
			this.hasMoved = true;
			if (horDist < -this.width / 2 && !this.testCollision(-1, 0) && this.x - this.speed > 0) this.x -= this.speed;
			else if (horDist >  this.width / 2 && !this.testCollision(1, 0) && this.x + this.speed < canvas.width - 20) this.x += this.speed;
		}
		if (Math.abs(verDist) / Math.abs(horDist) > this.moveRatio)
		{
			if (verDist < -this.height / 2 && !this.testCollision(0, -1) && this.y - this.speed > 0) this.y -= this.speed;
			else if (verDist >  this.height / 2 && !this.testCollision(0, 1) && this.y + this.speed < canvas.height - 20) this.y += this.speed;
		}
		this.oldHorDist = horDist; this.oldVerDist = verDist;
		
		//ctx.fillStyle(#444);
		//ctx.fillRect(Math.abs(horDist - this.followOffsetX));
		
		if (Math.abs(player.x - this.x) + Math.abs(player.y - this.y) < 15) start = null;
		//this.x = Math.min(Math.max(this.x, 0), canvas.width);
		//this.y = Math.min(Math.max(this.y, 0), canvas.height);
	}
}

function spawnEnemy()
{
	locX = Math.floor(Math.random() * game.w); locY = Math.floor(Math.random() * game.h);
	if (level[locY][locX] == 1 || Math.abs((locX * game.res + 10) - (player.x + 10)) < game.res * 4 && Math.abs((locY * game.res + 10) - (player.y + 10)) < game.res * 4) spawnEnemy();
	else toRender.push(new Enemy(locX * game.res, locY * game.res));
}

function keydown(e)
{
	let key = e.keyCode;
	//console.log(key, "pressed down");
	if (key == 37 || key == 65)
		player.moveLeft = true;
	if (key == 39 || key == 68)
		player.moveRight =  true;
	if (key == 38 || key == 87)
		player.moveUp = true;
	if (key == 40 || key == 83)
		player.moveDown =  true;
	if (key == 32 && !playing)
	{
		playing = true;
		game.start = elapsed;
	}
}

function keyup(e)
{
	let key = e.keyCode;
	//console.log (key, "released");
	if (key == 37 || key == 65)
		player.moveLeft = false;
	if (key == 39 || key == 68)
		player.moveRight =  false;
	if (key == 38 || key == 87)
		player.moveUp = false;
	if (key == 40 || key == 83)
		player.moveDown =  false;
}

function setupLevel()
{
	if (delved > 10) bg.src = "res/hellbg.jpg";
	if (!delved) levelStart = 0;
	else levelStart = timeLived;
	lastSpawn = 0;
	digLevel(Math.floor(player.x / 20), Math.floor(player.y / 20));
	spawnRate = Math.max(8, 15 - Math.floor(delved / 2));
	toRender.length = 1;
	//player.x = 100; player.y = 100;
	spawnEnemy();
}
function setupGame()
{
	playing = false;
	delved = 0;
	toRender = new Array;
	bg = new Image(); bg.src = "res/cavebg.jpg";
	sprites = new Image(); sprites.src = "res/spritesheet.png";
	walls = new Image(); walls.src = "res/walls.jpg";
	title = new Image(); title.src = "res/title.jpg";
	player = new Player(100, 100, 20, 20, "#991", 5);
	toRender.push(player);
	player.think(player.thoughts.beginning);
	setupLevel();
}

function drawGame()
{
	ctx.drawImage(bg, 0, 0);
	//ctx.fillStyle = "#615";
	//ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	ctx.fillStyle = "#7268";
	ctx.fillRect(player.x - 90, player.y - 90, 200, 200);
	
	for (let i = 0; i < toRender.length; i++)
	{
		toRender[i].move();
		if (Math.abs(toRender[i].x - player.x) <= 100 && Math.abs(toRender[i].y - player.y) <= 100)
		{
			if (i > 0)
			{
				player.feel("scared");
				if(!player.thoughts.frogs.inMemory) player.think(player.thoughts.frogs);
			}
			else player.feel("fine");
			toRender[i].render();
		}
	}
	for (let r = 0; r < 24; r++)
	{
		for (let c = 0; c < 32; c++)
		{
			if (Math.abs((c * 20 + 10) - (player.x + 10)) <= 100 && Math.abs((r * 20 + 10) - (player.y + 10)) <= 100)
			{
				switch(level[r][c])
				{
					case 1:
						ctx.drawImage(walls, (c * 20) % walls.width, (r * 20) % walls.height, 20, 20, (c * 20) % walls.width, (r * 20) % walls.height, 20, 20);
						break;
					case 2:
						if (!player.thoughts.doors.inMemory) player.think(player.thoughts.doors);
						ctx.drawImage(sprites, 0, 40, 20, 20, c * 20, r * 20, 20, 20);
						break;
					case 3:
						if (!player.thoughts.keys.inMemory) player.think(player.thoughts.keys);
						ctx.drawImage(sprites, 20, 40, 20, 20, c * 20, r * 20, 20, 20);
						break;
					default:
						break;
				}
			}
		}
	}
	if (Math.floor((elapsed - game.start) / 1000) > timeLived) player.grumble();
	timeLived = Math.floor((elapsed - game.start) / 1000);
	counter.innerHTML = timeLived;
	//console.log("global time is", timeLived, "local time is", timeLived - levelStart);
	if ((timeLived - levelStart) % spawnRate == 0 && timeLived - levelStart > lastSpawn)
	{
		spawnEnemy();
		console.log("enemy number", toRender.length - 1, "created!");
		lastSpawn = timeLived - levelStart;
	}
	
	//window.requestAnimationFrame(drawScreen);
}

function drawScreen()
{
	if (playing) drawGame();
	else
	{
		//ctx.fillStyle = "#313";
		//ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(title, 0, 0);
		ctx.fillStyle = "#5259";
		ctx.fillRect(canvas.width * 0.1, canvas.height * 0.1, canvas.width * 0.8, canvas.height * 0.8);
		ctx.fillStyle = "#e44";
		ctx.textAlign = "center";
		ctx.font = "22px 'Crimson Text'";
		ctx.fillText("Prepared to descend into these Qatacombs?", canvas.width * .5, canvas.height * 0.2);
		ctx.font = "30px 'Lora'";
		ctx.fillText("Press SPACE to start the game!", canvas.width * .5, canvas.height * 0.8);
	}
}

function step(timestamp)
{
	if (start == null)
	{
		start = prevTimestamp = timestamp;
		//console.log("doing initial drawing!");
		timeSinceDraw = 0;
		setupGame();
		//drawScreen();
	}
	elapsed = timestamp - start;
	deltaTime = timestamp - prevTimestamp;
	//console.log(deltaTime);
	
	if (timeSinceDraw >= 1000 / 60)
	{
		drawScreen();
		//console.log(timeSinceDraw, "milliseconds since last draw, so drawing again!");
		timeSinceDraw = 0;
	}
	else
	{
		timeSinceDraw += deltaTime;
		//console.log("no draw step yet, incrementing timeSinceDraw to " + timeSinceDraw + "!");
	}
	
	prevTimestamp = timestamp;
	
	window.requestAnimationFrame(step);
}

document.addEventListener("keydown", keydown);
document.addEventListener("keyup", keyup);
//setInterval(drawScreen, interval);
window.requestAnimationFrame(step);