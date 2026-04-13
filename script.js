/**
 * PRIME ICE POP - Interactive Scrollytelling
 * Expertly engineered vanilla JS implementation
 */

// 1. CONFIG
const config = {
    frameCount: 192,
    imagesPath: 'images/sequence/frame-',
    extension: '.jpg',
    lerpFactor: 0.08,
    canvasSectionId: 'canvas-section',
    bottleId: 'bottle'
};

// State management
const state = {
    images: [],
    loadedCount: 0,
    scrollProgress: 0,
    currentFrame: 0,
    isSequenceFinished: false,
    // Bottle transform targets
    targetX: 0,
    targetY: 0,
    targetScale: 0.6,
    targetRotate: 0,
    targetOpacity: 0,
    // Current lerped values
    currX: 0,
    currY: 0,
    currScale: 0.6,
    currRotate: 0,
    currOpacity: 0
};

const canvas = document.getElementById('sequence-canvas');
const context = canvas.getContext('2d');
const bottle = document.getElementById(config.bottleId);
const lerp = (a, b, t) => a + (b - a) * t;

// 2. PRELOADER
const preloadImages = () => {
    return new Promise((resolve) => {
        for (let i = 1; i <= config.frameCount; i++) {
            const img = new Image();
            const frameNum = i.toString().padStart(3, '0');
            img.src = `${config.imagesPath}${frameNum}${config.extension}`;
            img.onload = () => {
                state.loadedCount++;
                const progress = Math.floor((state.loadedCount / config.frameCount) * 100);
                document.getElementById('progress-bar').style.width = `${progress}%`;
                document.getElementById('loading-text').innerText = `LOADING ${progress}%`;

                if (state.loadedCount === config.frameCount) {
                    setTimeout(() => {
                        document.getElementById('preloader').classList.add('hidden');
                        resolve();
                    }, 500);
                }
            };
            state.images.push(img);
        }
    });
};

// 3. CANVAS RENDERER
const renderCanvas = () => {
    const img = state.images[state.currentFrame];
    if (!img) return;

    // Aspect ratio logic (object-fit: contain)
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;
    const imgWidth = img.width;
    const imgHeight = img.height;

    const ratio = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const centerShiftX = (canvasWidth - imgWidth * ratio) / 2;
    const centerShiftY = (canvasHeight - imgHeight * ratio) / 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(img, 0, 0, imgWidth, imgHeight, centerShiftX, centerShiftY, imgWidth * ratio, imgHeight * ratio);
};

// 4. OVERLAY CONTROLLER
const updateOverlays = (frameIndex) => {
    const overlays = [
        { el: document.getElementById('overlay-1'), range: [1, 64] },
        { el: document.getElementById('overlay-2'), range: [65, 128] },
        { el: document.getElementById('overlay-3'), range: [129, 192] }
    ];

    overlays.forEach(item => {
        if (frameIndex >= item.range[0] && frameIndex <= item.range[1]) {
            item.el.classList.add('active');
        } else {
            item.el.classList.remove('active');
        }
    });
};

// 5. BACKGROUND CONTROLLER
const updateBackground = (progress) => {
    // Progress is total page scroll 0-1
    // Interpolate between Blue (#0072BC) and Red (#E31C23)
    // Blue: rgb(0, 114, 188) -> Red: rgb(227, 28, 35)
    const r = Math.floor(lerp(0, 227, progress));
    const g = Math.floor(lerp(114, 28, progress));
    const b = Math.floor(lerp(188, 35, progress));
    document.body.style.background = `rgb(${r}, ${g}, ${b})`;
};

// 6. BOTTLE CONTROLLER
const updateBottleLogic = () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    const canvasSection = document.getElementById(config.canvasSectionId);
    const canvasBottom = canvasSection.offsetTop + canvasSection.offsetHeight;
    const footer = document.getElementById('footer');
    const footerTop = footer.offsetTop;

    if (scrollY > canvasBottom - windowHeight / 2) {
        state.targetOpacity = 1;

        // Phase 2 progress (from end of sequence to start of footer)
        const phase2Start = canvasBottom;
        const phase2End = footerTop;
        const phase2Range = phase2End - phase2Start;
        const phase2Progress = Math.max(0, Math.min(1, (scrollY - phase2Start) / phase2Range));

        // Sine wave movement
        state.targetX = Math.sin(phase2Progress * Math.PI * 3) * 150; // Zig zag
        state.targetRotate = (state.targetX / 150) * 15; // Tilt based on movement

        // Scale breathe effect
        state.targetScale = 0.6 + Math.sin(phase2Progress * Math.PI * 4) * 0.1;

        // Final landing logic
        const distanceToFooter = footerTop - (scrollY + windowHeight);
        if (distanceToFooter < 200) {
            const landingFactor = Math.max(0, Math.min(1, 1 - (distanceToFooter / 200)));
            state.targetX = lerp(state.targetX, 0, landingFactor);
            state.targetRotate = lerp(state.targetRotate, 0, landingFactor);
            state.targetScale = lerp(state.targetScale, 1.2, landingFactor);
            state.targetY = lerp(0, -windowHeight * 0.1, landingFactor);
        } else {
            state.targetY = 0;
        }

    } else {
        state.targetOpacity = 0;
    }
};

// 7. SCROLL & ANIMATION HANDLER
const handleScroll = () => {
    const scrollY = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const totalProgress = scrollY / docHeight;

    // Sequence section progress
    const canvasSection = document.getElementById(config.canvasSectionId);
    const sectionHeight = canvasSection.offsetHeight - window.innerHeight;
    const sequenceProgress = Math.max(0, Math.min(1, scrollY / sectionHeight));

    state.currentFrame = Math.floor(sequenceProgress * (config.frameCount - 1));

    updateOverlays(state.currentFrame + 1);
    updateBackground(totalProgress);
    updateBottleLogic();
};

const animate = () => {
    // Lerp bottle values
    state.currX = lerp(state.currX, state.targetX, config.lerpFactor);
    state.currY = lerp(state.currY, state.targetY, config.lerpFactor);
    state.currScale = lerp(state.currScale, state.targetScale, config.lerpFactor);
    state.currRotate = lerp(state.currRotate, state.targetRotate, config.lerpFactor);
    state.currOpacity = lerp(state.currOpacity, state.targetOpacity, config.lerpFactor);

    // Apply bottle transforms
    // Note: -50% -50% is to handle the absolute centering in CSS
    bottle.style.transform = `translate(calc(-50% + ${state.currX}px), calc(-50% + ${state.currY}px)) rotate(${state.currRotate}deg) scale(${state.currScale})`;
    bottle.style.opacity = state.currOpacity;

    renderCanvas();
    requestAnimationFrame(animate);
};

// 8. INIT
const init = async () => {
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', renderCanvas);

    await preloadImages();

    // Set initial state
    handleScroll();
    requestAnimationFrame(animate);
};

init();
