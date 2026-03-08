// main.js - 엔트리 포인트
(function () {
    'use strict';

    let canvas;
    let ctx;
    let lastTime = 0;

    // 카메라 및 조작 상태
    const camera = {
        x: 0,
        y: 1.5, // 플레이어 눈 높이
        z: 0,
        yaw: 0, // 좌우 회전 각도 (라디안)
        pitch: 0, // 상하 회전 각도 (라디안)
        fov: Math.PI / 3 // 시야각 (60도)
    };

    let isPointerLocked = false;
    const MOUSE_SENSITIVITY = 0.002;

    function resizeHandler() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function update(deltaTime) {
        // 게임 상태 업데이트 로직 (추후 구현)
    }

    /**
     * 3D 좌표를 2D 화면 좌표로 변환하는 Perspective Projection 함수
     * @param {number} x 3D 공간의 X 좌표
     * @param {number} y 3D 공간의 Y 좌표
     * @param {number} z 3D 공간의 Z 좌표
     * @returns {object|null} { screenX, screenY, scale } 화면 좌표와 스케일, 카메라 뒤쪽이면 null
     */
    function projectCoord(x, y, z) {
        // 1. 카메라 위치에 따른 Translation
        let relX = x - camera.x;
        let relY = y - camera.y;
        let relZ = z - camera.z;

        // 2. Y축(Yaw) 회전 적용 (좌우 마우스 이동)
        const cosYaw = Math.cos(camera.yaw);
        const sinYaw = Math.sin(camera.yaw);
        let rotX = relX * cosYaw - relZ * sinYaw;
        let rotZ = relX * sinYaw + relZ * cosYaw;

        // 3. X축(Pitch) 회전 적용 (상하 마우스 이동)
        const cosPitch = Math.cos(camera.pitch);
        const sinPitch = Math.sin(camera.pitch);
        let finalY = relY * cosPitch - rotZ * sinPitch;
        let finalZ = relY * sinPitch + rotZ * cosPitch;

        // 카메라 렌즈 뒤에 있는 점은 렌더링 무시
        if (finalZ <= 0.1) return null;

        // 4. 원근 투영 변환 (Perspective Projection)
        const fovMult = 1 / Math.tan(camera.fov / 2);
        const scale = fovMult / finalZ;

        // 5. 2D 화면 좌표 계산
        const screenX = (rotX * scale * canvas.height) + (canvas.width / 2);
        // Canvas는 Y축이 아래로 증가하므로 -를 붙여줌
        const screenY = (-finalY * scale * canvas.height) + (canvas.height / 2);

        return {
            screenX: screenX,
            screenY: screenY,
            scale: scale
        };
    }

    function initPointerLock() {
        // 캔버스 클릭 시 Pointer Lock 요청
        canvas.addEventListener('click', () => {
            if (!isPointerLocked) {
                canvas.requestPointerLock();
            }
        });

        // Pointer Lock 상태 변화 감지
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === canvas) {
                isPointerLocked = true;
            } else {
                isPointerLocked = false;
            }
        });

        // 마우스 움직임에 따른 시야 회전 (Mouse Look)
        document.addEventListener('mousemove', (e) => {
            if (!isPointerLocked) return;

            camera.yaw -= e.movementX * MOUSE_SENSITIVITY;
            camera.pitch -= e.movementY * MOUSE_SENSITIVITY;

            // Pitch 제한 (너무 위나 아래로 회전하지 않도록 제한, 약 -89도 ~ 89도)
            const MAX_PITCH = Math.PI / 2 - 0.05;
            if (camera.pitch > MAX_PITCH) camera.pitch = MAX_PITCH;
            if (camera.pitch < -MAX_PITCH) camera.pitch = -MAX_PITCH;
        });
    }

    function draw() {
        if (!ctx || !canvas) return;
        // 화면 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 임시 렌더링 영역
    }

    function gameLoop(timestamp) {
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        update(deltaTime);
        draw();

        requestAnimationFrame(gameLoop);
    }

    function init() {
        console.log('ZeroBaek 게임 초기화');
        canvas = document.getElementById('gameCanvas');
        ctx = canvas.getContext('2d');

        // 리사이즈 핸들러 등록
        window.addEventListener('resize', resizeHandler);
        resizeHandler(); // 초기 사이즈 설정

        // Pointer Lock 이벤트 초기화
        initPointerLock();

        // 메인 게임 루프 시작
        requestAnimationFrame((timestamp) => {
            lastTime = timestamp;
            gameLoop(timestamp);
        });
    }

    window.addEventListener('DOMContentLoaded', init);
})();
