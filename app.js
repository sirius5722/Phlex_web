const exerciseButton = document.getElementById('exerciseButton');
const stopButton = document.getElementById('stopButton');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');



let videoStream;

// Add click event listener to exercise button
exerciseButton.addEventListener('click', () => {
    console.log('Exercise button clicked.');
    startCamera();
});


// Add click event listener to stop button
stopButton.addEventListener('click', () => {
    console.log('Stop button clicked.');
    // Stop the camera
    videoStream.getTracks().forEach(track => track.stop());
    
    // Clear the video source object
    video.srcObject = null;
    
    // Hide the stop button and show the exercise button again
    stopButton.style.display = 'none';
    exerciseButton.style.display = 'block';
});


// Function to handle camera start process
function startCamera() {
    // Get the user media stream
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            // Store the video stream
            videoStream = stream;

            // Attach the stream to the video element
            video.srcObject = stream;

            // Set up the canvas to capture frames
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Capture a frame every 100ms
            setInterval(() => {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const frame = canvas.toDataURL();
                console.log(frame);
            }, 100);

            // Show the stop button and hide the exercise button
            stopButton.style.display = 'block';
            exerciseButton.style.display = 'none';
        })
        .catch(error => {
            console.error('Error accessing media devices.', error);
        });
}
