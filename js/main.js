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
    const EXPECTED_FPS_DELTATIME = 16.66;
    
    const velocity = { x: 0, z: 0 };
    const ACCELERATION = 0.05;
    const FRICTION = 0.85; // 관성 (값이 1에 가까울수록 미끄러짐)

    const keys = {
        w: false,
        a: false,
        s: false,
        d: false
    };

    // 트랙 설정
    const TRACK_WIDTH = 4;
    const TRACK_SEGMENT_LENGTH = 5;
    const TRACK_DRAW_DISTANCE = 50; // 앞으로 그릴 세그먼트 개수

    function resizeHandler() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function initInputHandlers() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) {
                keys[key] = true;
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (keys.hasOwnProperty(key)) {
                keys[key] = false;
            }
        });
    }

    function update(deltaTime) {
        // 시간에 따른 프레임 보정 비율
        const timeScale = deltaTime / EXPECTED_FPS_DELTATIME;

        // WASD 입력 처리 (카메라 방향 기준 상대적 이동)
        // 카메라가 바라보는 방향(forward) 및 우측 방향(right) 벡터 계산
        const cosYaw = Math.cos(camera.yaw);
        const sinYaw = Math.sin(camera.yaw);

        let inputX = 0;
        let inputZ = 0;

        // Z축 양수 방향이 전진이라고 가정
        if (keys.w) inputZ += 1;
        if (keys.s) inputZ -= 1;
        if (keys.a) inputX -= 1;
        if (keys.d) inputX += 1;

        // 대각선 이동 시 속도 정규화
        const length = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (length > 0) {
            inputX /= length;
            inputZ /= length;
        }

        // 로컬 입력을 월드 좌표계 이동 속도로 변환 (회전 행렬 적용)
        // forward 방향 (z축 다가가는 방향 = cosYaw, sinYaw에 의한 x,z 변화율)
        // 간단한 2D 회전 적용 (카메라 Yaw에 맞춰 변환)
        const moveX = (inputX * cosYaw + inputZ * sinYaw);
        const moveZ = (-inputX * sinYaw + inputZ * cosYaw);

        // 속도 및 가속도 (관성 적용)
        velocity.x += moveX * ACCELERATION * timeScale;
        velocity.z += moveZ * ACCELERATION * timeScale;

        // 마찰력 적용
        velocity.x *= FRICTION;
        velocity.z *= FRICTION;

        // 위치 업데이트
        camera.x += velocity.x * timeScale;
        camera.z += velocity.z * timeScale;
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
        // 화면 초기화 (검은 배경)
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = '#0ff'; // 네온 블루 색상 (임시 사이버펑크 감성)
        ctx.lineWidth = 1;

        ctx.beginPath();
        
        // 카메라 앞쪽(현재 z위치 기반) 트랙 세그먼트를 렌더링
        const startZ = Math.floor(camera.z / TRACK_SEGMENT_LENGTH) * TRACK_SEGMENT_LENGTH;

        for (let i = -5; i < TRACK_DRAW_DISTANCE; i++) {
            const zLine = startZ + i * TRACK_SEGMENT_LENGTH;
            const nextZLine = zLine + TRACK_SEGMENT_LENGTH;
            
            // 바닥(y=0) 기준 좌우 라인 투영
            const leftProj1 = projectCoord(-TRACK_WIDTH, 0, zLine);
            const leftProj2 = projectCoord(-TRACK_WIDTH, 0, nextZLine);
            
            const rightProj1 = projectCoord(TRACK_WIDTH, 0, zLine);
            const rightProj2 = projectCoord(TRACK_WIDTH, 0, nextZLine);
            
            // 중앙선 (점선 효과 용도 투영)
            const centerProj1 = projectCoord(0, 0, zLine);
            const centerProj2 = projectCoord(0, 0, zLine + TRACK_SEGMENT_LENGTH * 0.5);

            // 좌측 선 그리기
            if (leftProj1 && leftProj2) {
                ctx.moveTo(leftProj1.screenX, leftProj1.screenY);
                ctx.lineTo(leftProj2.screenX, leftProj2.screenY);
            }
            
            // 우측 선 그리기
            if (rightProj1 && rightProj2) {
                ctx.moveTo(rightProj1.screenX, rightProj1.screenY);
                ctx.lineTo(rightProj2.screenX, rightProj2.screenY);
            }
            
            // 중앙 점선 그리기
            if (centerProj1 && centerProj2) {
                ctx.moveTo(centerProj1.screenX, centerProj1.screenY);
                ctx.lineTo(centerProj2.screenX, centerProj2.screenY);
            }
            
            // 가로선 (그리드 효과) 그리기
            if (leftProj1 && rightProj1) {
                ctx.moveTo(leftProj1.screenX, leftProj1.screenY);
                ctx.lineTo(rightProj1.screenX, rightProj1.screenY);
            }
        }

        ctx.stroke();
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
        
        // 키보드 입력 핸들러 초기화
        initInputHandlers();

        // 메인 게임 루프 시작
        requestAnimationFrame((timestamp) => {
            lastTime = timestamp;
            gameLoop(timestamp);
        });
    }

    window.addEventListener('DOMContentLoaded', init);
})();
