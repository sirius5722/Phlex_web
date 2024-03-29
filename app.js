const out = document.getElementsByClassName('output')[0];
const canvasCtx = out.getContext('2d');
const videoElement = document.createElement('video');
document.body.appendChild(out);

let pose;

const camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
  });
    camera.start();


const drawOptions = {
  color: '#FF0000', // Landmark color
  radius: 4, // Landmark radius
  lineWidth: 2, // Connection line width
};

function startPoseDetection() {
  pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
    },
    modelComplexity: 2,
    enableSegmentation: true,
    smoothLandmarks: true,
    smoothSegmentation: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
  });
  pose.onResults(onResultsPose);
}

function stopPoseDetection() {
  camera.stop();
  pose.close();
}

function calculateAngle(point1, point2, point3) {
  const radians = Math.atan2(point3[1] - point2[1], point3[0] - point2[0]) - Math.atan2(point1[1] - point2[1], point1[0] - point2[0]);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  
  if (angle > 180.0) {
      angle = 360 - angle;
  }
  
  return angle;
}

function zColor(data) {
    const z = clamp(data.from.z + 0.5, 0, 1);
    return `rgba(0, ${255 * z}, ${255 * (1 - z)}, 1)`;
  }

function onResultsPose(results) {
    document.body.classList.add('loaded');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, out.width, out.height);
    canvasCtx.drawImage(
        results.image, 0, 0, out.width, out.height);
    drawConnectors(
        canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: (data) => {
            const x0 = out.width * data.from.x;
            const y0 = out.height * data.from.y;
            const x1 = out.width * data.to.x;
            const y1 = out.height * data.to.y;
  
            const z0 = clamp(data.from.z + 0.5, 0, 1);
            const z1 = clamp(data.to.z + 0.5, 0, 1); 
  
            const gradient = canvasCtx.createLinearGradient(x0, y0, x1, y1);
            gradient.addColorStop(
                0, `rgba(0, ${255 * z0}, ${255 * (1 - z0)}, 1)`);
            gradient.addColorStop( 
                1.0, `rgba(0, ${255 * z1}, ${255 * (1 - z1)}, 1)`);
            return gradient;
          }
        });
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_LEFT)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#FF0000'});
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_RIGHT)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#00FF00'});
    drawLandmarks(
        canvasCtx,
        Object.values(POSE_LANDMARKS_NEUTRAL)
            .map(index => results.poseLandmarks[index]),
        {color: zColor, fillColor: '#AAAAAA'});
  
  // Example of angle calculation
  const angle = calculateAngle(
    [results.poseLandmarks[11].x, results.poseLandmarks[11].y],
    [results.poseLandmarks[13].x, results.poseLandmarks[13].y],
    [results.poseLandmarks[15].x, results.poseLandmarks[15].y]
  );
  // Display angle on the canvas
  canvasCtx.fillStyle = '#FFFFFF';
  canvasCtx.fillText(`Angle: ${angle.toFixed(2)}°`, 10, 20);
  canvasCtx.restore();
  
}


startPoseDetection();
