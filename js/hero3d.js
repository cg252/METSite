/* ==========================================================================
   Michigan Trading and Technology — 3D hero scene (Three.js)
   An FPGA interconnect lattice with signal pulses + floating candlesticks.
   ========================================================================== */
(function () {
  'use strict';

  var mount = document.getElementById('hero3d');
  if (!mount || typeof THREE === 'undefined') return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var width = mount.clientWidth;
  var height = mount.clientHeight;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 200);
  camera.position.set(0, 2, 34);

  var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  mount.appendChild(renderer.domElement);

  var rig = new THREE.Group();
  scene.add(rig);

  /* ---------------------------------------------------------------- */
  /* Lights                                                            */
  /* ---------------------------------------------------------------- */
  scene.add(new THREE.AmbientLight(0x335577, 1.1));
  var keyLight = new THREE.PointLight(0x3aa0ff, 2.2, 90);
  keyLight.position.set(18, 14, 24);
  scene.add(keyLight);
  var rimLight = new THREE.PointLight(0x22ffa8, 1.8, 90);
  rimLight.position.set(-18, -8, 16);
  scene.add(rimLight);

  /* ---------------------------------------------------------------- */
  /* FPGA interconnect lattice (nodes + edges)                         */
  /* ---------------------------------------------------------------- */
  var GRID = 9;
  var SPACING = 3.1;
  var nodePositions = [];
  var nodeIndex = {};

  for (var ix = 0; ix < GRID; ix++) {
    for (var iy = 0; iy < GRID; iy++) {
      var x = (ix - (GRID - 1) / 2) * SPACING;
      var y = (iy - (GRID - 1) / 2) * SPACING;
      var z = (Math.sin(ix * 0.9) + Math.cos(iy * 0.7)) * 1.3;
      var idx = nodePositions.length;
      nodeIndex[ix + '_' + iy] = idx;
      nodePositions.push(new THREE.Vector3(x, y, z));
    }
  }

  // Points (nodes)
  var nodeGeo = new THREE.BufferGeometry();
  var nodeArr = new Float32Array(nodePositions.length * 3);
  var colorArr = new Float32Array(nodePositions.length * 3);
  var colBlue = new THREE.Color(0x7ad7ff);
  var colGreen = new THREE.Color(0x9dffd6);
  nodePositions.forEach(function (p, i) {
    nodeArr[i * 3] = p.x;
    nodeArr[i * 3 + 1] = p.y;
    nodeArr[i * 3 + 2] = p.z;
    var c = Math.random() > 0.5 ? colBlue : colGreen;
    colorArr[i * 3] = c.r; colorArr[i * 3 + 1] = c.g; colorArr[i * 3 + 2] = c.b;
  });
  nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodeArr, 3));
  nodeGeo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));
  var nodeMat = new THREE.PointsMaterial({
    size: 0.34,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true
  });
  var nodeCloud = new THREE.Points(nodeGeo, nodeMat);
  rig.add(nodeCloud);

  // Edges (interconnect fabric) — connect horizontal & vertical neighbors
  var edgePositions = [];
  var edgeList = []; // store index pairs for pulse travel
  for (var gx = 0; gx < GRID; gx++) {
    for (var gy = 0; gy < GRID; gy++) {
      var a = nodeIndex[gx + '_' + gy];
      if (gx < GRID - 1) {
        var b = nodeIndex[(gx + 1) + '_' + gy];
        edgeList.push([a, b]);
      }
      if (gy < GRID - 1) {
        var c2 = nodeIndex[gx + '_' + (gy + 1)];
        edgeList.push([a, c2]);
      }
    }
  }
  edgeList.forEach(function (pair) {
    var p1 = nodePositions[pair[0]];
    var p2 = nodePositions[pair[1]];
    edgePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  });
  var edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgePositions), 3));
  var edgeMat = new THREE.LineBasicMaterial({ color: 0x1c3a5e, transparent: true, opacity: 0.45 });
  var edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  rig.add(edgeLines);

  /* ---------------------------------------------------------------- */
  /* Signal pulses traveling along random edges                        */
  /* ---------------------------------------------------------------- */
  function pulseTexture(color) {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var cx = c.getContext('2d');
    var grd = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grd.addColorStop(0, color);
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = grd;
    cx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(c);
  }
  var pulseTexGreen = pulseTexture('rgba(34,255,168,1)');
  var pulseTexBlue = pulseTexture('rgba(58,160,255,1)');

  var PULSE_COUNT = 22;
  var pulses = [];
  for (var pIdx = 0; pIdx < PULSE_COUNT; pIdx++) {
    var mat = new THREE.SpriteMaterial({
      map: pIdx % 2 === 0 ? pulseTexGreen : pulseTexBlue,
      transparent: true,
      depthWrite: false,
      opacity: 0.9
    });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.9, 0.9, 1);
    rig.add(sprite);
    pulses.push({
      sprite: sprite,
      edge: edgeList[Math.floor(Math.random() * edgeList.length)],
      t: Math.random(),
      speed: 0.004 + Math.random() * 0.006
    });
  }

  function updatePulses() {
    pulses.forEach(function (p) {
      p.t += p.speed;
      if (p.t > 1) {
        p.t = 0;
        p.edge = edgeList[Math.floor(Math.random() * edgeList.length)];
      }
      var p1 = nodePositions[p.edge[0]];
      var p2 = nodePositions[p.edge[1]];
      p.sprite.position.lerpVectors(p1, p2, p.t);
    });
  }

  /* ---------------------------------------------------------------- */
  /* Candlesticks — stock-market motif, floating beside the lattice    */
  /* ---------------------------------------------------------------- */
  var candleGroup = new THREE.Group();
  candleGroup.position.set(15.5, -2, -4);
  rig.add(candleGroup);

  var CANDLE_COUNT = 11;
  var candles = [];
  var greenMat = new THREE.MeshStandardMaterial({ color: 0x22ffa8, emissive: 0x0c3b2b, roughness: 0.35, metalness: 0.4 });
  var blueMat = new THREE.MeshStandardMaterial({ color: 0x3aa0ff, emissive: 0x0c2240, roughness: 0.35, metalness: 0.4 });

  var prevClose = 0;
  for (var cIdx = 0; cIdx < CANDLE_COUNT; cIdx++) {
    var bodyH = 1 + Math.random() * 3.2;
    var up = Math.random() > 0.42;
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, bodyH, 0.9), up ? greenMat : blueMat);
    mesh.position.x = cIdx * 1.6 - (CANDLE_COUNT * 1.6) / 2;
    mesh.position.y = prevClose;
    candleGroup.add(mesh);

    // wick
    var wickH = bodyH + 1 + Math.random() * 1.2;
    var wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, wickH, 6),
      new THREE.MeshBasicMaterial({ color: up ? 0x9dffd6 : 0x7ad7ff, transparent: true, opacity: 0.55 })
    );
    wick.position.x = mesh.position.x;
    wick.position.y = mesh.position.y;
    candleGroup.add(wick);

    candles.push({ mesh: mesh, wick: wick, base: mesh.position.y, phase: Math.random() * Math.PI * 2 });
    prevClose += (up ? 1 : -1) * (0.3 + Math.random() * 0.6);
  }

  /* ---------------------------------------------------------------- */
  /* Animation loop                                                     */
  /* ---------------------------------------------------------------- */
  var mouseX = 0, mouseY = 0, targetRotX = 0, targetRotY = 0;
  window.addEventListener('mousemove', function (e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (e.clientY / window.innerHeight) * 2 - 1;
  });

  var clock = new THREE.Clock();
  var autoSpin = reducedMotion ? 0.01 : 0.045;

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();

    targetRotY += (mouseX * 0.35 - targetRotY) * 0.04;
    targetRotX += (-mouseY * 0.2 - targetRotX) * 0.04;

    rig.rotation.y = Math.sin(t * 0.06) * 0.25 + targetRotY + t * (reducedMotion ? 0.003 : 0.012) * autoSpin * 10;
    rig.rotation.x = Math.cos(t * 0.05) * 0.08 + targetRotX;

    if (!reducedMotion) updatePulses();

    candles.forEach(function (cnd) {
      var bob = Math.sin(t * 0.8 + cnd.phase) * 0.25;
      cnd.mesh.position.y = cnd.base + bob;
      cnd.wick.position.y = cnd.base + bob;
    });

    nodeCloud.rotation.z = Math.sin(t * 0.03) * 0.05;

    renderer.render(scene, camera);
  }
  animate();
  mount.classList.add('loaded');

  /* ---------------------------------------------------------------- */
  /* Resize                                                             */
  /* ---------------------------------------------------------------- */
  window.addEventListener('resize', function () {
    width = mount.clientWidth;
    height = mount.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
})();
