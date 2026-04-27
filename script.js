(() => {
  const canvas = document.getElementById("galaxy");
  const isMobile = window.matchMedia("(max-width: 760px)").matches;
  const starTotal = isMobile ? 150 : 400;
  const scene = new THREE.Scene();

  scene.fog = new THREE.FogExp2(0x21002f, 0.00072);

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 4200);
  camera.position.set(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0b0013, 1);

  const galaxyGroup = new THREE.Group();
  scene.add(galaxyGroup);

  function createStarTexture() {
    const starCanvas = document.createElement("canvas");
    starCanvas.width = 64;
    starCanvas.height = 64;
    const context = starCanvas.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.18, "rgba(255,224,255,0.94)");
    gradient.addColorStop(0.45, "rgba(212,126,255,0.38)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(starCanvas);
    texture.needsUpdate = true;
    return texture;
  }

  const starTexture = createStarTexture();

  const layers = [
    { name: "far", count: Math.floor(starTotal * 0.46), zMin: -3000, zMax: -2000, size: 5.5, opacity: 0.42, speed: 0.18 },
    { name: "mid", count: Math.floor(starTotal * 0.34), zMin: -2000, zMax: -800, size: 8.5, opacity: 0.68, speed: 0.42 },
    { name: "near", count: starTotal - Math.floor(starTotal * 0.46) - Math.floor(starTotal * 0.34), zMin: -800, zMax: 0, size: 12, opacity: 0.9, speed: 0.84 }
  ];

  const starLayers = layers.map((layer) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(layer.count * 3);
    const colors = new Float32Array(layer.count * 3);
    const palette = [
      new THREE.Color(0xffffff),
      new THREE.Color(0xffb8f6),
      new THREE.Color(0xd6a2ff),
      new THREE.Color(0x9f72ff)
    ];

    for (let i = 0; i < layer.count; i += 1) {
      const i3 = i * 3;
      positions[i3] = THREE.MathUtils.randFloatSpread(2000);
      positions[i3 + 1] = THREE.MathUtils.randFloatSpread(2000);
      positions[i3 + 2] = THREE.MathUtils.randFloat(layer.zMin, layer.zMax);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: layer.size,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: layer.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    galaxyGroup.add(points);
    return { ...layer, points, positions };
  });

  const nebulaGeometry = new THREE.BufferGeometry();
  const nebulaPositions = new Float32Array(75 * 3);
  const nebulaColors = new Float32Array(75 * 3);

  for (let i = 0; i < 75; i += 1) {
    const i3 = i * 3;
    nebulaPositions[i3] = THREE.MathUtils.randFloatSpread(1500);
    nebulaPositions[i3 + 1] = THREE.MathUtils.randFloatSpread(1200);
    nebulaPositions[i3 + 2] = THREE.MathUtils.randFloat(-2800, -700);
    const color = new THREE.Color(Math.random() > 0.5 ? 0x6f2aa1 : 0xff63cc);
    nebulaColors[i3] = color.r;
    nebulaColors[i3 + 1] = color.g;
    nebulaColors[i3 + 2] = color.b;
  }

  nebulaGeometry.setAttribute("position", new THREE.BufferAttribute(nebulaPositions, 3));
  nebulaGeometry.setAttribute("color", new THREE.BufferAttribute(nebulaColors, 3));
  const nebula = new THREE.Points(
    nebulaGeometry,
    new THREE.PointsMaterial({
      size: isMobile ? 52 : 72,
      map: starTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    })
  );
  galaxyGroup.add(nebula);

  const scrollState = { z: 0 };
  let targetZ = 0;
  let mouseX = 0;
  let mouseY = 0;
  let easedMouseX = 0;
  let easedMouseY = 0;

  function scrollDepth() {
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    return window.scrollY / maxScroll;
  }

  function syncCamera() {
    targetZ = -3000 * scrollDepth();
  }

  window.addEventListener("scroll", syncCamera, { passive: true });
  window.addEventListener("pointermove", (event) => {
    mouseX = (event.clientX / window.innerWidth - 0.5) * 0.34;
    mouseY = (event.clientY / window.innerHeight - 0.5) * 0.24;
  }, { passive: true });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  function recycleLayer(layer, travelPush) {
    const positions = layer.points.geometry.attributes.position.array;
    for (let i = 0; i < layer.count; i += 1) {
      const i3 = i * 3;
      positions[i3 + 2] += travelPush * layer.speed;
      if (positions[i3 + 2] - camera.position.z > 80) {
        positions[i3] = THREE.MathUtils.randFloatSpread(2000);
        positions[i3 + 1] = THREE.MathUtils.randFloatSpread(2000);
        positions[i3 + 2] = camera.position.z - 3000 - Math.random() * 420;
      }
    }
    layer.points.geometry.attributes.position.needsUpdate = true;
  }

  let lastCameraZ = 0;
  function animate() {
    requestAnimationFrame(animate);
    camera.position.z += (targetZ - camera.position.z) * 0.075;
    const deltaTravel = Math.max(0.4, Math.abs(camera.position.z - lastCameraZ) * 2.6);
    lastCameraZ = camera.position.z;

    easedMouseX += (mouseX - easedMouseX) * 0.045;
    easedMouseY += (mouseY - easedMouseY) * 0.045;
    camera.rotation.y = easedMouseX;
    camera.rotation.x = easedMouseY;

    starLayers.forEach((layer) => recycleLayer(layer, deltaTravel));
    nebula.rotation.z += 0.00008;
    galaxyGroup.rotation.z += 0.00004;
    renderer.render(scene, camera);
  }

  function initGsap() {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(scrollState, {
      z: -3000,
      ease: "none",
      scrollTrigger: {
        trigger: document.body,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2,
        onUpdate: (self) => {
          targetZ = scrollState.z || (-3000 * self.progress);
        }
      }
    });

    gsap.utils.toArray(".reveal").forEach((element) => {
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 82%",
          once: true
        }
      });
    });

    gsap.utils.toArray(".stagger-group").forEach((group) => {
      gsap.from(group.children, {
        opacity: 0,
        y: 26,
        stagger: 0.12,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: group,
          start: "top 84%",
          once: true
        }
      });
    });

    gsap.to(".float-layer", {
      y: -12,
      duration: 3.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.18
    });
  }

  function initNavbar() {
    const header = document.querySelector(".site-header");
    const menuButton = document.querySelector(".menu-toggle");
    const nav = document.querySelector(".nav-links");
    const navLinks = Array.from(document.querySelectorAll(".nav-links a[href^='#']"));
    const trackedSections = ["about", "services", "products", "contact"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!header || !menuButton || !nav) return;

    function setMenu(open) {
      nav.classList.toggle("is-open", open);
      header.classList.toggle("menu-open", open);
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }

    function setActive(hash) {
      navLinks.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("href") === hash);
      });
    }

    function headerOffset() {
      return Math.ceil(header.getBoundingClientRect().height + 10);
    }

    function scrollToSection(target) {
      const destination = Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset());

      if (window.gsap) {
        const tweenState = { y: window.scrollY };
        gsap.killTweensOf(tweenState);
        gsap.to(tweenState, {
          y: destination,
          duration: 0.9,
          ease: "power2.out",
          onUpdate: () => window.scrollTo(0, tweenState.y),
          onComplete: () => {
            window.scrollTo(0, destination);
            if (window.ScrollTrigger) ScrollTrigger.update();
          }
        });
      } else {
        window.scrollTo({ top: destination, behavior: "smooth" });
      }
    }

    menuButton.addEventListener("click", () => {
      setMenu(!nav.classList.contains("is-open"));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", (event) => {
        const target = document.querySelector(link.getAttribute("href"));
        if (!target) return;

        event.preventDefault();
        setMenu(false);
        setActive(link.getAttribute("href"));
        scrollToSection(target);
      });
    });

    window.addEventListener("scroll", () => {
      header.classList.toggle("is-scrolled", window.scrollY > 16);

      let currentSection = trackedSections[0];
      const activationLine = window.scrollY + headerOffset() + window.innerHeight * 0.22;
      trackedSections.forEach((section) => {
        if (section.offsetTop <= activationLine) currentSection = section;
      });

      if (currentSection) setActive(`#${currentSection.id}`);
    }, { passive: true });

    window.addEventListener("resize", () => {
      if (window.matchMedia("(min-width: 761px)").matches) setMenu(false);
    });
    header.classList.toggle("is-scrolled", window.scrollY > 16);
    const initialHash = trackedSections.find((section) => `#${section.id}` === window.location.hash);
    if (initialHash) setActive(`#${initialHash.id}`);
  }

  syncCamera();
  initGsap();
  initNavbar();
  animate();
})();
