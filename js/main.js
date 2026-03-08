// main.js - 엔트리 포인트
(function () {
    'use strict';

    let canvas;
    let ctx;
    let lastTime = 0;

    function resizeHandler() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function update(deltaTime) {
        // 게임 상태 업데이트 로직 (추후 구현)
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

        // 메인 게임 루프 시작
        requestAnimationFrame((timestamp) => {
            lastTime = timestamp;
            gameLoop(timestamp);
        });
    }

    window.addEventListener('DOMContentLoaded', init);
})();
