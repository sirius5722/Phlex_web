import { initializeApp } from 'firebase/app';
import {
  getStorage,
  ref,
  getDownloadURL
} from "firebase/storage";

import {Buffer} from 'buffer';

import { gunzipSync } from 'browserify-zlib';

const out = document.getElementsByClassName('output')[0];
const canvasCtx = out.getContext('2d');
const videoElement = document.createElement('video');
document.body.appendChild(out);

let pose;
let L_Marks;
let tolerance_deg = 10;
let Counter = 0;
let Msg = "";
let Exercise_Name = "Trial";

let Num_Of_Pose_Completed = 0;
let target_angles_list = [];
let pose_angles_list = [];

const Main_Angles = {
  "L_Neck": [0, 11, 12, 0],
  "R_Neck": [0, 12, 11, 1],
  "L_Shoulder": [13, 11, 23, 2],
  "R_Shoulder": [14, 12, 24, 3],
  "L_Elbow": [11, 13, 15, 4],
  "R_Elbow": [12, 14, 16, 5],
  "L_Wrist": [13, 15, 19, 6],
  "R_Wrist": [14, 16, 20, 7],
  "L_Hip": [11, 23, 25, 8],
  "R_Hip": [12, 24, 26, 9],
  "L_Knee": [23, 25, 27, 10],
  "R_Knee": [24, 26, 28, 11],
  "L_Ankle": [25, 27, 31, 12],
  "R_Ankle": [26, 28, 32, 13]
};


const firebaseConfig = {
  apiKey: "AIzaSyDWvuxuXutLo1FJuTEvxc5earHo2T20dFs",
  authDomain: "phlex-d0508.firebaseapp.com",
  projectId: "phlex-d0508",
  storageBucket: "phlex-d0508.appspot.com",
  messagingSenderId: "310184582416",
  appId: "1:310184582416:web:a32a52988ba2874e46d995", 
  measurementId: "G-H5VLZFY9E2" 
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

window.downloadFile = (path) => {
  return new Promise((resolve, reject) => {
      getDownloadURL(ref(storage, 'Exercises/' + path))
          .then((url) => {
              var xhr = new XMLHttpRequest();
              xhr.responseType = 'text';
              xhr.onload = (event) => {
                  var txt = xhr.response;
                  resolve(txt);
              };
              xhr.open('GET', url);
              xhr.send();
          }).catch((error) => {
              reject(error);
          })
  })
}

function decompressFromBase64(compressedStr) {
  const compressedBuffer = Buffer.from(compressedStr, 'base64');
  const decompressedBuffer = gunzipSync(compressedBuffer);
  return decompressedBuffer.toString('utf8');
}

function getExercise(exercisePath){
  window.downloadFile(exercisePath)
    .then((txt) => {
    console.log(txt);
    const decompressedString = decompressFromBase64(txt);
    const jsonObject = JSON.parse(decompressedString);
    jsonObject["poses"].forEach((lst) => pose_angles_list.push(lst["mainAngles"]));
    target_angles_list = jsonObject["targetedAngles"];
    
    console.log(target_angles_list);
    console.log(pose_angles_list);
  }).catch((error) => {
    console.log(error);
})
}

getExercise("authenticatedExercises/TestExcercise/MediaPipeData");

const camera = new Camera(videoElement, {
    onFrame: async () => {
      await pose.send({ image: videoElement });
    },
  });


async function startPoseDetection() {
  pose = new Pose({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.2/${file}`;
    },
    modelComplexity: 2,
    minDetectionConfidence: 0.9,
    minTrackingConfidence: 0.9
  });

  try {
    await pose.onResults(onResultsPose);
    console.log("Pose detection started successfully.");
  } catch (error) {
    console.error("Error starting pose detection:", error);
  }
}

function stopPoseDetection() {
  camera.stop();
  pose.close();
}

function calculateAngle(point1, point2, point3) {
  const radians = Math.atan2(point3[1] - point2[1], point3[0] - point2[0]) - Math.atan2(point1[1] - point2[1], point1[0] - point2[0]);
  let angle = Math.round(Math.abs(radians * 180.0 / Math.PI));
  
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
    if (!results || !results.poseLandmarks) {
        console.log("No pose landmarks detected.");
        return;
    }
    document.body.classList.add('loaded');
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, out.width, out.height);
    canvasCtx.drawImage(
        results.image, 0, 0, out.width, out.height);

    L_Marks = results.poseLandmarks
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

    // RT(Real Time) Angles list will hold angles for the current frame
    let RT_Angles = [];
    // Correct Angles list will hold pose angles with which we want to compare our camera feedback
    let Correct_Angles = [];
    // Iterate through the list of target angles (angles of interest for each exercise)
    for (let angle_name of target_angles_list) {
        // Val will hold the angle definition (i.e., Key-Value pair in Main_Angles dictionary)
        let Val = Main_Angles[angle_name];
        // Calculate the angle and add it to RT_Angles
        let rt_angle = calculateAngle(
            [L_Marks[Val[0]].x, L_Marks[Val[0]].y],
            [L_Marks[Val[1]].x, L_Marks[Val[1]].y],
            [L_Marks[Val[2]].x, L_Marks[Val[2]].y]
        );
        RT_Angles.push(rt_angle);

        let correct_angle = pose_angles_list[Num_Of_Pose_Completed][Val[3]];
        Correct_Angles.push(correct_angle);
    }

    // Initialize Angle_Match variable
    let Angle_Match = 0;

    // Iterate through RT_Angles and Correct_Angles to count how many angles are matched within a defined range (i.e., tolerance)
    for (let i = 0; i < RT_Angles.length; i++) {
        let rt_angle = RT_Angles[i];
        let correct_angle = Correct_Angles[i];
        
        if (Math.abs(rt_angle - correct_angle) <= tolerance_deg) {
            Angle_Match += 1;
        }
    }

    // If all angles are matched, indicate that one pose is completed
    if (Angle_Match === RT_Angles.length) {
        Angle_Match = 0;
        Num_Of_Pose_Completed += 1;

        // If all poses are completed, increase exercise counter and start over
        if (Num_Of_Pose_Completed === pose_angles_list.length) {
            Counter += 1;
            Num_Of_Pose_Completed = 0;
            Msg = `${Counter} Times Elapsed.`;
            console.log(Msg);
        } else {
            Msg = `Moving to Pose number ${Num_Of_Pose_Completed + 1}.`;
            console.log(Msg);
        }
    }
    canvasCtx.fillStyle = '#ffff00';
    canvasCtx.font = "bold 24px serif";
    canvasCtx.fillText(`pose number: ${Num_Of_Pose_Completed}`, 10, 20);
    canvasCtx.restore();

    canvasCtx.fillStyle = '#ff2e98';
    canvasCtx.font = "bold 24px serif";
    canvasCtx.fillText(`Counter: ${Counter}`, 10, 50);
    canvasCtx.restore();

}

camera.start();
startPoseDetection();