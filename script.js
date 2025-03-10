// Pre-loaded games
const rambosGreatAssault = {
    title: "Rambo's Great Assault",
    description: "Join Rambo in a wilderness shootout! Use WASD or touch joystick to move, mouse or touch to aim and shoot. Buy upgrades with your score to survive waves of enemies.",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rambo's Great Assault</title>
    <style>
        canvas {
            border: 1px solid black;
            display: block;
            margin: 0 auto;
            touch-action: none;
        }
        body {
            text-align: center;
            background: #111;
            color: white;
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            overflow: hidden;
        }
        #upgrades {
            margin: 10px;
        }
        button {
            padding: 5px 10px;
            margin: 5px;
            background: #333;
            color: white;
            border: 1px solid #555;
            cursor: pointer;
        }
        button:hover {
            background: #555;
        }
    </style>
</head>
<body>
    <h1>Rambo's Great Assault</h1>
    <p>Score: <span id="score">1000</span> | Round: <span id="round">1</span> | HP: <span id="health">100</span></p>
    <div id="upgrades">
        <button onclick="buyUpgrade('shotgun')">Shotgun (100)</button>
        <button onclick="buyUpgrade('rifle')">Rifle (500)</button>
        <button onclick="buyUpgrade('speed')">Speed Boost (300)</button>
        <button onclick="buyUpgrade('health')">Health Pack (200)</button>
        <button onclick="buyUpgrade('flamethrower')">Flamethrower (600)</button>
    </div>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('score');
        const roundDisplay = document.getElementById('round');
        const healthDisplay = document.getElementById('health');
        const upgradesDiv = document.getElementById('upgrades');

        const player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 20,
            speed: 5,
            hp: 100,
            bullets: [],
            weapon: { name: 'pistol', damage: 10, rate: 500, spread: 0, recoil: 2, shots: 1, range: Infinity },
            lastShot: 0,
            angle: 0,
            recoilOffset: { x: 0, y: 0 }
        };

        let enemies = [];
        let particles = [];
        let muzzleFlashes = [];
        let enemyBullets = [];
        let powerUps = [];
        let stars = [];
        let walls = [
            { x: 200, y: 150, width: 100, height: 20 },
            { x: 500, y: 400, width: 20, height: 100 },
            { x: 300, y: 500, width: 150, height: 20 }
        ];
        let bushes = [
            { x: 150, y: 300, radius: 40 },
            { x: 600, y: 200, radius: 50 }
        ];
        let score = 1000;
        let round = 1;
        let roundTime = 0;
        let roundTransitionTime = 0;
        let inTransition = false;
        let enemySpeed = 2;
        let spawnRate = 5000;
        let backgroundOffset = 0;
        let isShooting = false;

        let joystick = { active: false, x: 0, y: 0, dx: 0, dy: 0 };
        let shootTouch = { active: false, x: 0, y: 0 };

        for (let i = 0; i < 50; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2,
                speed: Math.random() * 0.5 + 0.5
            });
        }

        const keys = {};
        window.addEventListener('keydown', (e) => keys[e.key] = true);
        window.addEventListener('keyup', (e) => keys[e.key] = false);
        canvas.addEventListener('mousedown', () => isShooting = true);
        canvas.addEventListener('mouseup', () => isShooting = false);
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        });

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touches = e.changedTouches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touches[i].clientX - rect.left;
                const touchY = touches[i].clientY - rect.top;

                if (touchX < canvas.width / 2) {
                    joystick.active = true;
                    joystick.x = touchX;
                    joystick.y = touchY;
                    joystick.dx = 0;
                    joystick.dy = 0;
                } else {
                    shootTouch.active = true;
                    shootTouch.x = touchX;
                    shootTouch.y = touchY;
                    player.angle = Math.atan2(touchY - player.y, touchX - player.x);
                    isShooting = true;
                }
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touches = e.touches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touches[i].clientX - rect.left;
                const touchY = touches[i].clientY - rect.top;

                if (joystick.active && touchX < canvas.width / 2) {
                    const dx = touchX - joystick.x;
                    const dy = touchY - joystick.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = 50;
                    joystick.dx = Math.min(maxDist, Math.max(-maxDist, dx)) / maxDist;
                    joystick.dy = Math.min(maxDist, Math.max(-maxDist, dy)) / maxDist;
                } else if (shootTouch.active && touchX >= canvas.width / 2) {
                    shootTouch.x = touchX;
                    shootTouch.y = touchY;
                    player.angle = Math.atan2(touchY - player.y, touchX - player.x);
                }
            }
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const touches = e.changedTouches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touches[i].clientX - rect.left;
                if (touchX < canvas.width / 2) {
                    joystick.active = false;
                    joystick.dx = 0;
                    joystick.dy = 0;
                } else {
                    shootTouch.active = false;
                    isShooting = false;
                }
            }
        });

        class Bullet {
            constructor(x, y, dx, dy, spread, owner) {
                this.x = x;
                this.y = y;
                this.dx = dx + (Math.random() - 0.5) * spread;
                this.dy = dy + (Math.random() - 0.5) * spread;
                this.radius = owner.weapon.name === 'shotgun' ? 3 : owner.weapon.name === 'flamethrower' ? 5 : 5;
                this.speed = owner.weapon.name === 'rifle' ? 15 : owner.weapon.name === 'flamethrower' ? 8 : 10;
                this.damage = owner.weapon.damage;
                this.range = owner.weapon.range;
                this.distanceTraveled = 0;
                this.isFlame = owner.weapon.name === 'flamethrower';
                this.owner = owner;
            }
            update() {
                this.x += this.dx * this.speed;
                this.y += this.dy * this.speed;
                this.distanceTraveled += this.speed;
                if (this.isFlame) {
                    particles.push(new Particle(this.x, this.y, 'orange'));
                }
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.isFlame ? 'orange' : this.owner.weapon.name === 'rifle' ? '#FFA500' : 'yellow';
                ctx.fill();
            }
        }

        class EnemyBullet {
            constructor(x, y, dx, dy) {
                this.x = x;
                this.y = y;
                this.dx = dx;
                this.dy = dy;
                this.speed = 5;
                this.radius = 4;
            }
            update() {
                this.x += this.dx * this.speed;
                this.y += this.dy * this.speed;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'red';
                ctx.fill();
            }
        }

        class Particle {
            constructor(x, y, color = null) {
                this.x = x;
                this.y = y;
                this.radius = Math.random() * 3 + 1;
                this.dx = (Math.random() - 0.5) * 4;
                this.dy = (Math.random() - 0.5) * 4;
                this.life = 30;
                this.color = color || (Math.random() < 0.5 ? '#8B0000' : '#FF0000');
            }
            update() {
                this.x += this.dx;
                this.y += this.dy;
                this.life--;
                this.radius *= 0.95;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }
        }

        class MuzzleFlash {
            constructor(x, y, angle) {
                this.x = x;
                this.y = y;
                this.angle = angle;
                this.life = 5;
            }
            update() {
                this.life--;
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(15, 5);
                ctx.lineTo(25, 0);
                ctx.lineTo(15, -5);
                ctx.fillStyle = 'rgba(255, 165, 0, ' + (this.life / 5) + ')';
                ctx.fill();
                ctx.restore();
            }
        }

        class Enemy {
            constructor(type) {
                const side = Math.floor(Math.random() * 4);
                if (side === 0) { this.x = Math.random() * canvas.width; this.y = -20; }
                else if (side === 1) { this.x = canvas.width + 20; this.y = Math.random() * canvas.height; }
                else if (side === 2) { this.x = Math.random() * canvas.width; this.y = canvas.height + 20; }
                else { this.x = -20; this.y = Math.random() * canvas.height; }

                this.type = type;
                this.speed = enemySpeed;
                this.angle = 0;

                if (type === 'militant') {
                    this.radius = 12;
                    this.hp = 1;
                    this.color = '#556B2F';
                    this.turbanColor = '#8B4513';
                } else if (type === 'warrior') {
                    this.radius = 15;
                    this.speed *= 1.5;
                    this.hp = 2;
                    this.color = '#6B8E23';
                    this.turbanColor = '#228B22';
                    this.shootCooldown = Math.random() * 2000 + 1000;
                } else if (type === 'commander') {
                    this.radius = 20;
                    this.speed *= 0.7;
                    this.hp = 4;
                    this.color = '#2F4F4F';
                    this.turbanColor = '#483D8B';
                    this.spawnCooldown = 5000;
                }
                this.knockback = { x: 0, y: 0 };
            }
            update() {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                this.angle = Math.atan2(dy, dx);

                let effectiveSpeed = this.speed;
                if (this.type === 'commander' && dist > 100) effectiveSpeed = 0;

                let newX = this.x + (dx / dist) * effectiveSpeed + this.knockback.x;
                let newY = this.y + (dy / dist) * effectiveSpeed + this.knockback.y;

                let collided = false;
                walls.forEach(wall => {
                    if (this.checkWallCollision(wall, newX, newY)) {
                        collided = true;
                    }
                });
                if (!collided) {
                    this.x = newX;
                    this.y = newY;
                }

                this.knockback.x *= 0.9;
                this.knockback.y *= 0.9;

                if (this.type === 'warrior' && Date.now() - (this.lastShot || 0) > this.shootCooldown) {
                    this.shoot();
                    this.lastShot = Date.now();
                }

                if (this.type === 'commander' && Date.now() - (this.lastSpawn || 0) > this.spawnCooldown) {
                    this.spawnMinion();
                    this.lastSpawn = Date.now();
                }
            }
            shoot() {
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                enemyBullets.push(new EnemyBullet(this.x, this.y, dx / dist, dy / dist));
            }
            spawnMinion() {
                enemies.push(new Enemy('militant'));
            }
            draw() {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.angle);

                const bodyGradient = ctx.createRadialGradient(0, 0, 5, 0, 0, this.radius);
                bodyGradient.addColorStop(0, this.color);
                bodyGradient.addColorStop(1, '#333');
                ctx.beginPath();
                ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = bodyGradient;
                ctx.fill();
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(0, -this.radius * 0.6, this.radius * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = this.turbanColor;
                ctx.fill();

                ctx.fillStyle = '#444';
                ctx.fillRect(this.radius * 0.5, -2, this.radius, 3);

                ctx.fillStyle = 'red';
                ctx.fillRect(-this.radius, -this.radius - 5, this.radius * 2 * (this.hp / (this.type === 'commander' ? 4 : this.type === 'warrior' ? 2 : 1)), 3);

                ctx.restore();
            }
            die() {
                for (let i = 0; i < 10; i++) {
                    particles.push(new Particle(this.x, this.y));
                }
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(this.x, this.y, 'orange'));
                }
                spawnPowerUp(this.x, this.y);
            }
            hit(bullet) {
                this.hp -= Math.ceil(bullet.damage / 10);
                const knockbackForce = bullet.owner.weapon.name === 'shotgun' ? 5 : 2;
                this.knockback.x = -bullet.dx * knockbackForce;
                this.knockback.y = -bullet.dy * knockbackForce;
                if (this.hp <= 0) this.die();
            }
            checkWallCollision(wall, x = this.x, y = this.y) {
                return (
                    x + this.radius > wall.x &&
                    x - this.radius < wall.x + wall.width &&
                    y + this.radius > wall.y &&
                    y - this.radius < wall.y + wall.height
                );
            }
        }

        function shoot() {
            const now = Date.now();
            if (now - player.lastShot < player.weapon.rate) return;
            player.lastShot = now;

            const dx = Math.cos(player.angle);
            const dy = Math.sin(player.angle);

            if (player.weapon.name === 'shotgun') {
                for (let i = 0; i < 5; i++) {
                    player.bullets.push(new Bullet(player.x, player.y, dx, dy, player.weapon.spread, player));
                }
            } else if (player.weapon.name === 'flamethrower') {
                for (let i = 0; i < 3; i++) {
                    player.bullets.push(new Bullet(player.x, player.y, dx + (Math.random() - 0.5) * 0.2, dy + (Math.random() - 0.5) * 0.2, player.weapon.spread, player));
                }
            } else {
                player.bullets.push(new Bullet(player.x, player.y, dx, dy, player.weapon.spread, player));
            }

            player.recoilOffset.x = -dx * player.weapon.recoil;
            player.recoilOffset.y = -dy * player.weapon.recoil;
            setTimeout(() => { player.recoilOffset.x = 0; player.recoilOffset.y = 0; }, 100);
            muzzleFlashes.push(new MuzzleFlash(player.x + dx * 20, player.y + dy * 20, player.angle));
        }

        function spawnEnemy() {
            if (inTransition) return;
            let type = 'militant';
            if (round >= 10) type = Math.random() < 0.2 ? 'commander' : Math.random() < 0.3 ? 'warrior' : 'militant';
            else if (round >= 5) type = Math.random() < 0.3 ? 'warrior' : 'militant';
            enemies.push(new Enemy(type));
            setTimeout(spawnEnemy, spawnRate);
        }
        spawnEnemy();

        function spawnPowerUp(x, y) {
            if (Math.random() < 0.2) {
                powerUps.push({
                    x, y,
                    type: ['health', 'speed', 'damage'][Math.floor(Math.random() * 3)],
                    radius: 10,
                    life: 5000
                });
            }
        }

        function checkCollision(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < a.radius + b.radius;
        }

        function checkBulletWallCollision(bullet, wall) {
            return (
                bullet.x + bullet.radius > wall.x &&
                bullet.x - bullet.radius < wall.x + wall.width &&
                bullet.y + bullet.radius > wall.y &&
                bullet.y - bullet.radius < wall.y + wall.height
            );
        }

        function checkBushCollision(obj, bush) {
            const dist = Math.sqrt((obj.x - bush.x) ** 2 + (obj.y - bush.y) ** 2);
            return dist < obj.radius + bush.radius;
        }

        function buyUpgrade(type) {
            if (type === 'shotgun' && score >= 100) {
                player.weapon = { name: 'shotgun', damage: 20, rate: 800, spread: 0.2, recoil: 5, shots: 5, range: Infinity };
                score -= 100;
            } else if (type === 'rifle' && score >= 500) {
                player.weapon = { name: 'rifle', damage: 15, rate: 200, spread: 0.05, recoil: 3, shots: 1, range: Infinity };
                score -= 500;
            } else if (type === 'speed' && score >= 300) {
                player.speed = 7;
                score -= 300;
                setTimeout(() => player.speed = 5, 60000);
            } else if (type === 'health' && score >= 200) {
                player.hp = Math.min(player.hp + 50, 100);
                score -= 200;
            } else if (type === 'flamethrower' && score >= 600) {
                player.weapon = { name: 'flamethrower', damage: 5, rate: 50, spread: 0.2, recoil: 1, shots: 3, range: 200 };
                score -= 600;
            }
            scoreDisplay.textContent = score;
            healthDisplay.textContent = player.hp;
        }

        function drawPlayer(shooter) {
            ctx.save();
            ctx.translate(shooter.x + shooter.recoilOffset.x, shooter.y + shooter.recoilOffset.y);
            ctx.rotate(shooter.angle);

            const torsoGradient = ctx.createLinearGradient(-10, -15, 10, 15);
            torsoGradient.addColorStop(0, '#4B5320');
            torsoGradient.addColorStop(0.5, '#6B8E23');
            torsoGradient.addColorStop(1, '#556B2F');
            ctx.fillStyle = torsoGradient;
            ctx.fillRect(-10, -15, 20, 30);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(-10, -15, 20, 30);

            ctx.beginPath();
            ctx.arc(0, -18, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#FFDAB9';
            ctx.fill();
            ctx.strokeStyle = '#8B4513';
            ctx.stroke();

            ctx.fillStyle = '#FF0000';
            ctx.fillRect(-8, -22, 16, 4);

            ctx.fillStyle = '#FFDAB9';
            ctx.fillRect(-14, -10, 4, 20);
            ctx.fillRect(10, -10, 4, 20);
            ctx.strokeStyle = '#8B4513';
            ctx.strokeRect(-14, -10, 4, 20);
            ctx.strokeRect(10, -10, 4, 20);

            ctx.fillStyle = '#4B5320';
            ctx.fillRect(-8, 5, 6, 15);
            ctx.fillRect(2, 5, 6, 15);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(-8, 5, 6, 15);
            ctx.strokeRect(2, 5, 6, 15);

            ctx.fillStyle = '#333';
            ctx.fillRect(10, -5, 20, 4);
            ctx.fillStyle = '#555';
            ctx.fillRect(10, -3, 5, 2);

            ctx.fillStyle = '#000';
            ctx.fillRect(-8, 18, 6, 4);
            ctx.fillRect(2, 18, 6, 4);

            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(-8, -18);
            ctx.lineTo(-12, -10);
            ctx.lineTo(-6, -12);
            ctx.fill();

            ctx.restore();

            if (joystick.active) {
                ctx.beginPath();
                ctx.arc(joystick.x, joystick.y, 50, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(joystick.x + joystick.dx * 50, joystick.y + joystick.dy * 50, 20, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fill();
            }
        }

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            skyGradient.addColorStop(0, '#87CEFA');
            skyGradient.addColorStop(1, '#228B22');
            ctx.fillStyle = skyGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            backgroundOffset += 0.5;
            if (backgroundOffset > canvas.height) backgroundOffset = 0;
            ctx.fillStyle = '#006400';
            for (let i = -1; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(100, canvas.height - 50 + backgroundOffset + i * canvas.height);
                ctx.lineTo(120, canvas.height - 100 + backgroundOffset + i * canvas.height);
                ctx.lineTo(140, canvas.height - 50 + backgroundOffset + i * canvas.height);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(400, canvas.height - 60 + backgroundOffset + i * canvas.height);
                ctx.lineTo(420, canvas.height - 120 + backgroundOffset + i * canvas.height);
                ctx.lineTo(440, canvas.height - 60 + backgroundOffset + i * canvas.height);
                ctx.fill();
            }

            stars.forEach(star => {
                star.y += star.speed;
                if (star.y > canvas.height) star.y = -star.radius;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = 'white';
                ctx.fill();
            });

            walls.forEach(wall => {
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            });

            bushes.forEach(bush => {
                ctx.beginPath();
                ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#228B22';
                ctx.fill();
            });

            if (inTransition) {
                roundTransitionTime += 16;
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = 'white';
                ctx.font = '30px Arial';
                ctx.fillText(\`Round \${round} Starting in \${Math.ceil((3000 - roundTransitionTime) / 1000)}s\`, canvas.width / 2 - 150, canvas.height / 2);
                if (roundTransitionTime >= 3000) {
                    inTransition = false;
                    roundTransitionTime = 0;
                    spawnEnemy();
                }
            } else {
                let newX = player.x;
                let newY = player.y;
                if (keys['w']) newY -= player.speed;
                if (keys['s']) newY += player.speed;
                if (keys['a']) newX -= player.speed;
                if (keys['d']) newX += player.speed;
                if (joystick.active) {
                    newX += joystick.dx * player.speed;
                    newY += joystick.dy * player.speed;
                }

                newX = Math.max(player.radius, Math.min(canvas.width - player.radius, newX));
                newY = Math.max(player.radius, Math.min(canvas.height - player.radius, newY));

                let collided = false;
                walls.forEach(wall => {
                    if (
                        newX + player.radius > wall.x &&
                        newX - player.radius < wall.x + wall.width &&
                        newY + player.radius > wall.y &&
                        newY - player.radius < wall.y + wall.height
                    ) {
                        collided = true;
                    }
                });
                if (!collided) {
                    player.x = newX;
                    player.y = newY;
                }

                roundTime += 16;
                if (roundTime >= 60000) {
                    round++;
                    roundTime = 0;
                    inTransition = true;
                    enemySpeed *= 1.1;
                    spawnRate *= 0.9;
                    roundDisplay.textContent = round;
                    player.hp = Math.min(player.hp + 10, 100);
                    healthDisplay.textContent = player.hp;
                }
            }

            drawPlayer(player);

            if (isShooting) shoot();

            for (let bIndex = player.bullets.length - 1; bIndex >= 0; bIndex--) {
                const bullet = player.bullets[bIndex];
                bullet.update();
                bullet.draw();

                let shouldRemove = bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height || bullet.distanceTraveled > bullet.range;

                walls.forEach(wall => {
                    if (checkBulletWallCollision(bullet, wall)) shouldRemove = true;
                });
                bushes.forEach(bush => {
                    if (checkBushCollision(bullet, bush)) shouldRemove = true;
                });

                if (shouldRemove) {
                    player.bullets.splice(bIndex, 1);
                    continue;
                }

                for (let eIndex = enemies.length - 1; eIndex >= 0; eIndex--) {
                    const enemy = enemies[eIndex];
                    if (checkCollision(bullet, enemy)) {
                        enemy.hit(bullet);
                        player.bullets.splice(bIndex, 1);
                        if (enemy.hp <= 0) {
                            enemies.splice(eIndex, 1);
                            score += enemy.type === 'commander' ? 50 : enemy.type === 'warrior' ? 30 : 20;
                            scoreDisplay.textContent = score;
                        }
                        break;
                    }
                }
            }

            enemies.forEach((enemy, eIndex) => {
                enemy.update();
                enemy.draw();

                if (checkCollision(player, enemy)) {
                    player.hp -= 10;
                    enemy.die();
                    enemies.splice(eIndex, 1);
                    healthDisplay.textContent = player.hp;
                    if (player.hp <= 0) {
                        alert(\`Game Over! Score: \${score}\`);
                        document.location.reload();
                    }
                }
            });

            for (let bIndex = enemyBullets.length - 1; bIndex >= 0; bIndex--) {
                const bullet = enemyBullets[bIndex];
                bullet.update();
                bullet.draw();
                let shouldRemove = bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height;
                walls.forEach(wall => {
                    if (checkBulletWallCollision(bullet, wall)) shouldRemove = true;
                });
                bushes.forEach(bush => {
                    if (checkBushCollision(bullet, bush)) shouldRemove = true;
                });

                if (shouldRemove) {
                    enemyBullets.splice(bIndex, 1);
                } else if (checkCollision(bullet, player)) {
                    player.hp -= 5;
                    enemyBullets.splice(bIndex, 1);
                    healthDisplay.textContent = player.hp;
                    if (player.hp <= 0) {
                        alert(\`Game Over! Score: \${score}\`);
                        document.location.reload();
                    }
                }
            }

            particles.forEach((particle, pIndex) => {
                particle.update();
                particle.draw();
                if (particle.life <= 0) particles.splice(pIndex, 1);
            });

            muzzleFlashes.forEach((flash, fIndex) => {
                flash.update();
                flash.draw();
                if (flash.life <= 0) muzzleFlashes.splice(fIndex, 1);
            });

            powerUps.forEach((powerUp, pIndex) => {
                powerUp.life -= 16;
                ctx.beginPath();
                ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
                ctx.fillStyle = powerUp.type === 'health' ? 'green' : powerUp.type === 'speed' ? 'blue' : 'purple';
                ctx.fill();
                if (checkCollision(player, powerUp)) {
                    if (powerUp.type === 'health') player.hp = Math.min(player.hp + 20, 100);
                    else if (powerUp.type === 'speed') {
                        player.speed = 8;
                        setTimeout(() => player.speed = 5, 10000);
                    } else if (powerUp.type === 'damage') {
                        const oldDamage = player.weapon.damage;
                        player.weapon.damage *= 2;
                        setTimeout(() => player.weapon.damage = oldDamage, 10000);
                    }
                    powerUps.splice(pIndex, 1);
                    healthDisplay.textContent = player.hp;
                }
                if (powerUp.life <= 0) powerUps.splice(pIndex, 1);
            });

            requestAnimationFrame(update);
        }
        update();
    </script>
</body>
</html>`,
    type: 'html'
};

const enaDreamGame = {
    title: "ENA: Dream Game Chapter 1",
    description: "Explore a surreal dreamscape as ENA, solving puzzles and interacting with AI dream entities. Use WASD or touch to move, space to interact.",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ENA: Dream Game Chapter 1</title>
    <style>
        canvas {
            border: 1px solid #000;
            display: block;
            margin: 0 auto;
            background: #87ceeb;
        }
        body {
            background: #333;
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        #dialogue {
            position: absolute;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
            max-width: 300px;
            display: none;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div id="dialogue"></div>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const dialogue = document.getElementById('dialogue');

        const player = {
            x: 100,
            y: 300,
            width: 30,
            height: 50,
            speed: 5,
            vx: 0,
            vy: 0,
            gravity: 0.5,
            jumpPower: -15,
            onGround: false
        };

        let entities = [];
        let platforms = [
            { x: 0, y: 450, width: 200, height: 50 },
            { x: 300, y: 400, width: 200, height: 50 },
            { x: 600, y: 350, width: 200, height: 50 }
        ];

        for (let i = 0; i < 5; i++) {
            entities.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 20,
                speed: 2,
                type: ['friendly', 'hostile', 'neutral'][Math.floor(Math.random() * 3)],
                behavior: 'idle'
            });
        }

        const keys = {};
        window.addEventListener('keydown', (e) => keys[e.key] = true);
        window.addEventListener('keyup', (e) => keys[e.key] = false);
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        let touchControls = { left: false, right: false, jump: false };

        function handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            if (touchX < canvas.width / 2) {
                if (touchY < canvas.height / 2) touchControls.jump = true;
                else if (touchX < canvas.width / 4) touchControls.left = true;
                else touchControls.right = true;
            }
        }

        function handleTouchMove(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = touch.clientX - rect.left;
            const touchY = touch.clientY - rect.top;
            if (touchX < canvas.width / 2) {
                touchControls.left = touchX < canvas.width / 4;
                touchControls.right = touchX >= canvas.width / 4 && touchX < canvas.width / 2;
                touchControls.jump = touchY < canvas.height / 2;
            }
        }

        function handleTouchEnd(e) {
            e.preventDefault();
            touchControls.left = false;
            touchControls.right = false;
            touchControls.jump = false;
        }

        function checkCollision(a, b) {
            return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        }

        function updateEntities() {
            entities.forEach(entity => {
                const dx = player.x - entity.x;
                const dy = player.y - entity.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (entity.type === 'friendly' && dist < 200) {
                    entity.behavior = 'follow';
                    entity.x += (dx / dist) * entity.speed;
                    entity.y += (dy / dist) * entity.speed;
                } else if (entity.type === 'hostile' && dist < 300) {
                    entity.behavior = 'attack';
                    if (Math.random() < 0.01) {
                        entity.x += (dx / dist) * entity.speed * 1.5;
                        entity.y += (dy / dist) * entity.speed * 1.5;
                    }
                } else if (entity.type === 'neutral') {
                    entity.behavior = 'idle';
                    entity.x += Math.random() * 2 - 1;
                    entity.y += Math.random() * 2 - 1;
                }

                entity.x = Math.max(0, Math.min(canvas.width - entity.radius * 2, entity.x));
                entity.y = Math.max(0, Math.min(canvas.height - entity.radius * 2, entity.y));

                if (dist < 50 && Math.random() < 0.05) {
                    showDialogue(entity.type === 'friendly' ? "Hello, ENA! Follow me..." : 
                                entity.type === 'hostile' ? "Leave this dream!" : "I'm just drifting...");
                }
            });
        }

        function showDialogue(text) {
            dialogue.textContent = text;
            dialogue.style.display = 'block';
            setTimeout(() => dialogue.style.display = 'none', 3000);
        }

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#87ceeb';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#228b22';
            platforms.forEach(platform => {
                ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
            });

            player.vx = 0;
            if (keys['a'] || touchControls.left) player.vx = -player.speed;
            if (keys['d'] || touchControls.right) player.vx = player.speed;
            if ((keys['w'] || touchControls.jump) && player.onGround) {
                player.vy = player.jumpPower;
                player.onGround = false;
            }

            player.vy += player.gravity;
            player.x += player.vx;
            player.y += player.vy;

            player.onGround = false;
            platforms.forEach(platform => {
                if (checkCollision(player, platform)) {
                    if (player.vy > 0) {
                        player.y = platform.y - player.height;
                        player.vy = 0;
                        player.onGround = true;
                    } else if (player.vy < 0) {
                        player.y = platform.y + platform.height;
                        player.vy = 0;
                    }
                    if (player.vx > 0) player.x = platform.x - player.width;
                    else if (player.vx < 0) player.x = platform.x + platform.width;
                }
            });

            player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

            ctx.fillStyle = '#ff69b4';
            ctx.fillRect(player.x, player.y, player.width, player.height);

            updateEntities();
            entities.forEach(entity => {
                ctx.fillStyle = entity.type === 'friendly' ? '#00ff00' : entity.type === 'hostile' ? '#ff0000' : '#ffff00';
                ctx.beginPath();
                ctx.arc(entity.x, entity.y, entity.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            requestAnimationFrame(update);
        }

        update();
    </script>
</body>
</html>`,
    type: 'html'
};

const aiShooterDemo = {
    title: "AI Shooter Demo",
    description: "Battle adaptive AI enemies in a sci-fi cityscape. Use WASD or touch to move, mouse or touch to aim and shoot. Upgrade weapons to survive.",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Shooter Demo</title>
    <style>
        canvas {
            border: 1px solid #000;
            display: block;
            margin: 0 auto;
            background: #1a1a1a;
        }
        body {
            background: #333;
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: Arial, sans-serif;
        }
        #upgrades {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: #fff;
            padding: 10px;
            border-radius: 5px;
        }
        button {
            padding: 5px 10px;
            margin: 5px;
            background: #444;
            color: #fff;
            border: 1px solid #666;
            cursor: pointer;
        }
        button:hover {
            background: #666;
        }
    </style>
</head>
<body>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div id="upgrades">
        <p>Score: <span id="score">0</span> | HP: <span id="health">100</span></p>
        <button onclick="buyUpgrade('shotgun')">Shotgun (100)</button>
        <button onclick="buyUpgrade('sniper')">Sniper (300)</button>
        <button onclick="buyUpgrade('speed')">Speed Boost (200)</button>
        <button onclick="buyUpgrade('health')">Health Pack (150)</button>
    </div>
    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreDisplay = document.getElementById('score');
        const healthDisplay = document.getElementById('health');

        const player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: 20,
            speed: 5,
            hp: 100,
            bullets: [],
            weapon: { name: 'pistol', damage: 10, rate: 500, spread: 0, recoil: 2, range: 500 },
            lastShot: 0,
            angle: 0,
            recoilOffset: { x: 0, y: 0 }
        };

        let enemies = [];
        let particles = [];
        let enemyBullets = [];

        let buildings = [
            { x: 100, y: 300, width: 50, height: 200 },
            { x: 400, y: 250, width: 70, height: 250 },
            { x: 650, y: 350, width: 60, height: 150 }
        ];

        function spawnEnemy() {
            enemies.push({
                x: Math.random() * canvas.width,
                y: -20,
                radius: 15,
                hp: 2,
                speed: 2,
                angle: 0,
                behavior: 'patrol',
                lastShot: 0
            });
            setTimeout(spawnEnemy, 2000);
        }
        spawnEnemy();

        const keys = {};
        window.addEventListener('keydown', (e) => keys[e.key] = true);
        window.addEventListener('keyup', (e) => keys[e.key] = false);
        canvas.addEventListener('mousedown', () => isShooting = true);
        canvas.addEventListener('mouseup', () => isShooting = false);
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            player.angle = Math.atan2(mouseY - player.y, mouseX - player.x);
        });

        let isShooting = false;
        let touchControls = { left: false, right: false, up: false, down: false, shoot: false, shootX: 0, shootY: 0 };
        canvas.addEventListener('touchstart', handleTouchStart);
        canvas.addEventListener('touchmove', handleTouchMove);
        canvas.addEventListener('touchend', handleTouchEnd);

        function handleTouchStart(e) {
            e.preventDefault();
            const touches = e.touches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touches[i].clientX - rect.left;
                const touchY = touches[i].clientY - rect.top;
                if (touchX < canvas.width / 2) {
                    if (touchY < canvas.height / 3) touchControls.up = true;
                    else if (touchY > 2 * canvas.height / 3) touchControls.down = true;
                    else if (touchX < canvas.width / 4) touchControls.left = true;
                    else touchControls.right = true;
                } else {
                    touchControls.shoot = true;
                    touchControls.shootX = touchX;
                    touchControls.shootY = touchY;
                    player.angle = Math.atan2(touchY - player.y, touchX - player.x);
                }
            }
        }

        function handleTouchMove(e) {
            e.preventDefault();
            const touches = e.touches;
            for (let i = 0; i < touches.length; i++) {
                const rect = canvas.getBoundingClientRect();
                const touchX = touches[i].clientX - rect.left;
                const touchY = touches[i].clientY - rect.top;
                if (touchX < canvas.width / 2) {
                    touchControls.up = touchY < canvas.height / 3;
                    touchControls.down = touchY > 2 * canvas.height / 3;
                    touchControls.left = touchX < canvas.width / 4;
                    touchControls.right = touchX >= canvas.width / 4 && touchX < canvas.width / 2;
                } else {
                    touchControls.shootX = touchX;
                    touchControls.shootY = touchY;
                    player.angle = Math.atan2(touchY - player.y, touchX - player.x);
                }
            }
        }

        function handleTouchEnd(e) {
            e.preventDefault();
            touchControls.left = false;
            touchControls.right = false;
            touchControls.up = false;
            touchControls.down = false;
            touchControls.shoot = false;
        }

        class Bullet {
            constructor(x, y, dx, dy, spread, owner) {
                this.x = x;
                this.y = y;
                this.dx = dx + (Math.random() - 0.5) * spread;
                this.dy = dy + (Math.random() - 0.5) * spread;
                this.radius = 5;
                this.speed = owner.weapon.name === 'sniper' ? 15 : 10;
                this.damage = owner.weapon.damage;
                this.range = owner.weapon.range;
                this.distanceTraveled = 0;
            }
            update() {
                this.x += this.dx * this.speed;
                this.y += this.dy * this.speed;
                this.distanceTraveled += this.speed;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ffff00';
                ctx.fill();
            }
        }

        class EnemyBullet {
            constructor(x, y, dx, dy) {
                this.x = x;
                this.y = y;
                this.dx = dx;
                this.dy = dy;
                this.speed = 5;
                this.radius = 4;
            }
            update() {
                this.x += this.dx * this.speed;
                this.y += this.dy * this.speed;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ff0000';
                ctx.fill();
            }
        }

        class Particle {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.radius = Math.random() * 5 + 2;
                this.dx = (Math.random() - 0.5) * 4;
                this.dy = (Math.random() - 0.5) * 4;
                this.life = 30;
            }
            update() {
                this.x += this.dx;
                this.y += this.dy;
                this.life--;
                this.radius *= 0.95;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#ff4500';
                ctx.fill();
            }
        }

        function shoot() {
            const now = Date.now();
            if (now - player.lastShot < player.weapon.rate) return;
            player.lastShot = now;

            const dx = Math.cos(player.angle);
            const dy = Math.sin(player.angle);
            player.bullets.push(new Bullet(player.x, player.y, dx, dy, player.weapon.spread, player));

            player.recoilOffset.x = -dx * player.weapon.recoil;
            player.recoilOffset.y = -dy * player.weapon.recoil;
            setTimeout(() => { player.recoilOffset.x = 0; player.recoilOffset.y = 0; }, 100);
        }

        function updateEnemies() {
            enemies.forEach((enemy, index) => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (enemy.behavior === 'patrol') {
                    enemy.x += Math.random() * 2 - 1;
                    enemy.y += Math.random() * 2 - 1;
                    if (dist < 300) enemy.behavior = 'chase';
                } else if (enemy.behavior === 'chase') {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                    if (dist < 100 && Math.random() < 0.01) enemy.behavior = 'dodge';
                    if (dist > 400) enemy.behavior = 'patrol';
                    if (Date.now() - enemy.lastShot > 2000 && Math.random() < 0.02) {
                        enemy.shoot();
                        enemy.lastShot = Date.now();
                    }
                } else if (enemy.behavior === 'dodge') {
                    enemy.x += -(dx / dist) * enemy.speed * 1.5;
                    enemy.y += -(dy / dist) * enemy.speed * 1.5;
                    if (Math.random() < 0.05) enemy.behavior = 'chase';
                }

                enemy.x = Math.max(0, Math.min(canvas.width - enemy.radius * 2, enemy.x));
                enemy.y = Math.max(0, Math.min(canvas.height - enemy.radius * 2, enemy.y));
                buildings.forEach(building => {
                    if (enemy.x + enemy.radius > building.x && enemy.x - enemy.radius < building.x + building.width &&
                        enemy.y + enemy.radius > building.y && enemy.y - enemy.radius < building.y + building.height) {
                        enemy.x -= (dx / dist) * enemy.speed;
                        enemy.y -= (dy / dist) * enemy.speed;
                    }
                });

                enemy.draw();
            });
        }

        Enemy.prototype.shoot = function() {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            enemyBullets.push(new EnemyBullet(this.x, this.y, dx / dist, dy / dist));
        };

        Enemy.prototype.draw = function() {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        };

        function checkCollision(a, b) {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            return dist < a.radius + b.radius;
        }

        function checkBuildingCollision(obj, building) {
            return obj.x + obj.radius > building.x && obj.x - obj.radius < building.x + building.width &&
                   obj.y + obj.radius > building.y && obj.y - obj.radius < building.y + building.height;
        }

        let score = 0;
        function buyUpgrade(type) {
            if (type === 'shotgun' && score >= 100) {
                player.weapon = { name: 'shotgun', damage: 20, rate: 800, spread: 0.2, recoil: 5, range: 300 };
                score -= 100;
            } else if (type === 'sniper' && score >= 300) {
                player.weapon = { name: 'sniper', damage: 50, rate: 1000, spread: 0.01, recoil: 8, range: 1000 };
                score -= 300;
            } else if (type === 'speed' && score >= 200) {
                player.speed = 7;
                score -= 200;
                setTimeout(() => player.speed = 5, 10000);
            } else if (type === 'health' && score >= 150) {
                player.hp = Math.min(player.hp + 50, 100);
                score -= 150;
            }
            scoreDisplay.textContent = score;
            healthDisplay.textContent = player.hp;
        }

        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            buildings.forEach(building => {
                ctx.fillRect(building.x, building.y, building.width, building.height);
            });

            let newX = player.x;
            let newY = player.y;
            if (keys['w'] || touchControls.up) newY -= player.speed;
            if (keys['s'] || touchControls.down) newY += player.speed;
            if (keys['a'] || touchControls.left) newX -= player.speed;
            if (keys['d'] || touchControls.right) newX += player.speed;

            let collided = false;
            buildings.forEach(building => {
                if (checkBuildingCollision({ x: newX, y: newY, radius: player.radius }, building)) {
                    collided = true;
                }
            });
            if (!collided) {
                player.x = newX;
                player.y = newY;
            }

            ctx.save();
            ctx.translate(player.x + player.recoilOffset.x, player.y + player.recoilOffset.y);
            ctx.rotate(player.angle);
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(-player.radius, -player.radius, player.radius * 2, player.radius * 2);
            ctx.restore();

            if (isShooting || touchControls.shoot) {
                if (touchControls.shoot) {
                    const rect = canvas.getBoundingClientRect();
                    const touchX = touchControls.shootX - rect.left;
                    const touchY = touchControls.shootY - rect.top;
                    player.angle = Math.atan2(touchY - player.y, touchX - player.x);
                }
                shoot();
            }

            player.bullets.forEach((bullet, bIndex) => {
                bullet.update();
                bullet.draw();

                let shouldRemove = bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height || bullet.distanceTraveled > bullet.range;
                buildings.forEach(building => {
                    if (checkBuildingCollision(bullet, building)) shouldRemove = true;
                });

                if (shouldRemove) {
                    player.bullets.splice(bIndex, 1);
                    return;
                }

                enemies.forEach((enemy, eIndex) => {
                    if (checkCollision(bullet, enemy)) {
                        enemy.hp -= bullet.damage;
                        player.bullets.splice(bIndex, 1);
                        if (enemy.hp <= 0) {
                            enemies.splice(eIndex, 1);
                            score += 20;
                            scoreDisplay.textContent = score;
                            for (let i = 0; i < 10; i++) {
                                particles.push(new Particle(enemy.x, enemy.y));
                            }
                        }
                    }
                });
            });

            updateEnemies();
            enemyBullets.forEach((bullet, bIndex) => {
                bullet.update();
                bullet.draw();

                let shouldRemove = bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height;
                buildings.forEach(building => {
                    if (checkBuildingCollision(bullet, building)) shouldRemove = true;
                });

                if (shouldRemove) {
                    enemyBullets.splice(bIndex, 1);
                    return;
                }

                if (checkCollision(bullet, player)) {
                    player.hp -= 10;
                    enemyBullets.splice(bIndex, 1);
                    healthDisplay.textContent = player.hp;
                    if (player.hp <= 0) {
                        alert(`Game Over! Score: ${score}`);
                        document.location.reload();
                    }
                }
            });

            particles.forEach((particle, pIndex) => {
                particle.update();
                particle.draw();
                if (particle.life <= 0) particles.splice(pIndex, 1);
            });

            requestAnimationFrame(update);
        }

        update();
    </script>
</body>
</html>`,
    type: 'html'
};

// Array to store uploaded games, starting with all pre-loaded games
let games = [rambosGreatAssault, enaDreamGame, aiShooterDemo];

// Ensure DOM is loaded before running scripts
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('gameUploadForm').addEventListener('submit', function(e) {
        e.preventDefault();

        const title = document.getElementById('gameTitle').value;
        const fileInput = document.getElementById('gameFile').files[0];
        const description = document.getElementById('gameDesc').value;

        if (fileInput) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const gameContent = event.target.result;
                const game = {
                    title: title,
                    description: description,
                    content: gameContent,
                    type: fileInput.name.endsWith('.js') ? 'js' : 'html'
                };
                games.push(game);
                displayGames();
                document.getElementById('gameUploadForm').reset();
            };
            reader.readAsText(fileInput);
        }
    });

    function displayGames() {
        const gameList = document.getElementById('gameList');
        gameList.innerHTML = '';

        games.forEach((game, index) => {
            const gameCard = document.createElement('div');
            gameCard.className = 'game-card';
            gameCard.innerHTML = `
                <h3>${game.title}</h3>
                <p>${game.description}</p>
                <button onclick="playGame(${index})">Play Now</button>
            `;
            gameList.appendChild(gameCard);
        });
    }

    function playGame(index) {
        const game = games[index];
        const gameWindow = window.open('', '_blank');
        if (game.type === 'html') {
            gameWindow.document.write(game.content);
            gameWindow.document.close();
        } else if (game.type === 'js') {
            gameWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>${game.title}</title></head>
                <body>
                    <h1>${game.title}</h1>
                    <p>Running AI-built JS game...</p>
                    <script>${game.content}</script>
                </body>
                </html>
            `);
            gameWindow.document.close();
        }
    }

    // Display games on page load
    displayGames();

    // Update AI-Bot's Daily Picks in sidebar (optional, for realism)
    const dailyPicks = document.querySelector('.sidebar-picks ul');
    if (dailyPicks) {
        dailyPicks.innerHTML = `
            <li>1. ${enaDreamGame.title} - <a href="#play" onclick="playGame(1)">Play</a> (3,180 views)</li>
            <li>2. ${aiShooterDemo.title} - <a href="#play" onclick="playGame(2)">Play</a> (531 views)</li>
        `;
    }
});
