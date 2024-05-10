let webcamStream;
async function loadModel() {
    /**
    Tải mô hình COCO SSD
    */
    try {
        let model = await cocoSsd.load();
        return model;
    } catch (e) {
        console.log(`Lỗi tải mô hình COCO SSD ! ${e}`);
        thongBao(`Lỗi tải mô hình COCO SSD ! ${e}`);
    }

}

function detectVideoFile() {
    let wrong = false;
    let file = event.target.files[0];
    // Kiểm tra tệp có phải là video hay không ?
    if (file.type.split('/')[0] !== 'video') {
        thongBao('Tệp tải lên phải là video !', 'warning');
        wrong = true;
    }
    // Kiểm tra dung lượng tệp tải lên
    if (file.size > 100000000000000000) {
        thongBao('Dung lượng của ảnh phải < 100MB !', 'warning');
        wrong = true;
    }
    // Nếu không có lỗi thì tiếp tục
    if (!wrong) {
        let video = $("#video-file video")[0];
        let canvas = $("#video-file canvas")[0];
        let context = canvas.getContext('2d');
        // Reset tham số src và box
        video.src = '';
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Bắt đầu khởi tạo đường dẫn từ tệp video đã tải lên
        let videoUrl = URL.createObjectURL(file);
        video.src = videoUrl;

        // Load meta của video & bắt đầu chạy dự đoán
        video.onloadedmetadata = async () => {
            await video.play();
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            runDetect(video, canvas);
        };
    }
}
async function detectObjects(model, video) {
    /**
    Phát hiện đối tượng trên từng frame
    */
    let predictions = await model.detect(video);
    return predictions;
}

function drawBoxes(predictions, canvas) {
    /**
    Vẽ bounding box lên frame canvas
    */
    let context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    predictions.forEach(prediction => {
        // Lấy tọa độ box [x, y, w, h]
        let [x, y, w, h] = prediction.bbox;
        // Lấy độ tin cậy của box (2 chữ số thập phân)
        let score = prediction.score.toFixed(2);
        context.beginPath();
        // Bắt đầu vẽ bouding box
        context.rect(x, y, w, h);
        // Quy định độ dày & màu sắc của đường viền
        context.lineWidth = 3;
        context.strokeStyle = 'green';
        context.fillStyle = 'green';
        context.stroke();
        // In text lên box
        context.font = '16px Arial';
        context.fillStyle = "yellow";
        context.fillText(`${prediction.class} ${score}`, x, y - 5);
    });
}

async function setupWebcam() {
    /**
    Bắt đầu đọc Webcam
    */
    let video = $("#webcam video")[0];
    if (navigator.mediaDevices.getUserMedia) {
        let stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "environment",
                width: 1280,
                height: 720
            },
            audio: false
        });
        video.srcObject = stream;
        webcamStream = stream;
        return new Promise(resolve => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        thongBao("Không thể khởi động webcam. Thử lại !", "error");
    }
}

async function runDetect(video, canvas) {
    /**
    Bắt đầu quá trình phát hiện đối tượng
    @param video Video đầu vào
    @param canvas Canvas là video đầu ra sau khi dự đoán & vẽ box đối tượng
    */
    let model = await loadModel();
    video.play();
    let context = canvas.getContext('2d');
    // Đặt kích thước canvas tương tự video đầu vào
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Bắt đầu quá trình detect 
    async function detect() {
        // Phát hiện đối tượng
        let predictions = await detectObjects(model, video);
        // Vẽ bounding box
        drawBoxes(predictions, canvas);
        // Tiếp tục quá trình phát hiện
        requestAnimationFrame(detect);
    }
    detect();
}

function playVideo() {
    $("#video-file video")[0].play();
}

function stopVideo() {
    $("#video-file video")[0].pause();
}

function stopWebcam() {
    if (webcamStream) {
        let video = $("#webcam video")[0];
        // Dừng các track
        webcamStream.getTracks().forEach(track => {
            track.stop();
        });

        // Xóa dữ liệu biến
        webcamStream = null;

        // Dừng video & xóa src
        video.pause();
        video.srcObject = null;
    }
}

async function chooseInput(i_type) {
    document.getElementById("video-file").style.display = "none";
    document.getElementById("webcam").style.display = "none";

    if (i_type == "video") {
        stopWebcam();
        document.getElementById("video-file").style.display = "block";
    }

    if (i_type == "webcam") {
        stopVideo();
        document.getElementById("webcam").style.display = "block";
        let video = await setupWebcam();
        let canvas = $("#webcam canvas")[0];
        canvas.width = video.width
        canvas.height = video.height;
        video.play();
        runDetect(video, canvas);
    }
}