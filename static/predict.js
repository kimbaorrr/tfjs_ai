var project = {};
var classes = {};
var num_classes = undefined;
var num_results = 5;
var model = undefined;
var image_size = [];
var img = document.getElementById('img-to-show');

async function loadModel() {
    /**
     * Tải mô hình
     */
    try {
        loadSpin();
        scrollDown();
        model = await tf.loadLayersModel(project.model);
    } catch (e) {
        thongBao(`Có lỗi khi tải mô hình. Thử tải lại trang !\n${e.message}`, 'error');
        console.error(e.message);
    }
};

function loadImage(event) {
    /**
     * Upload ảnh từ máy người dùng
     */
    hideXemThem();
    let wrong = false;
    file = event.target.files[0];
    // Kiểm tra tệp có phải là ảnh hay không ?
    if (file.type.split('/')[0] !== 'image') {
        thongBao('Tệp tải lên phải là một ảnh !', 'warning');
        wrong = true;
    }
    // Kiểm tra dung lượng tệp tải lên
    if (file.size > 10000000) {
        thongBao('Dung lượng của ảnh phải < 10MB !', 'warning');
        wrong = true;
    }
    // Nếu không có lỗi thì hiện ảnh, enable button dự đoán và ngược lại
    if (!wrong) {
        enablePredBtn();
        // Hiển thị ảnh người dùng vừa upload
        img.src = URL.createObjectURL(file);
        img.width, img.height = image_size;
    }
    else {
        disablePredBtn();
    }
};

function preProcessingImage() {
    /**
     * Tiền xử lý ảnh đầu vào trước khi đưa vào mô hình
     */
    let offset = tf.scalar(127);
    // Scale ảnh về dạng 0-1,thực hiện resize ảnh  & mở rộng chiều của ảnh
    let tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor(image_size)
        .toFloat().sub(offset).div(offset).expandDims(0);
    console.log(`Input image tensor shape: ${tensor.shape}`)
    return tensor;
};

function loadSpin() {
    /**
     * Hiện circle loadings
     */
    document.getElementById("best-result").style.display = "none";
    document.getElementById("loading-spin").style.display = "block";
}

function hideSpin() {
    /**
     * Ẩn circle loadings
     */
    document.getElementById("best-result").style.display = "block";
    document.getElementById("loading-spin").style.display = "none";
}

function enablePredBtn() {
    document.getElementById("pred-btn").disabled = false;
}

function disablePredBtn() {
    document.getElementById("pred-btn").disabled = true;
}

function hideXemThem() {
    document.getElementById('xem-them').style.display = "none";
}

function showXemThem() {
    document.getElementById('xem-them').style.display = "block";
}

function scrollDown() {
    let x = $(window).scrollTop();
    $('html, body').animate({ scrollTop: x + 600 })
}

async function predictImage() {
    /**
     * Dự đoán ảnh đầu vào & xuất kết quả dự đoán
     */
    // Clear data cũ
    let results_label = [];
    let results_acc = [];
    // Tải mô hình
    await loadModel();
    // Tiền xử lý ảnh đầu vào
    let tensor = preProcessingImage();
    // Bắt đầu dự đoán & xuất kết quả
    let predictions = await model.predict(tensor).data();
    // Mapping dạng key:value, sắp xếp kết quả dự đoán theo thứ tự giảm dần & chỉ lấy tối đa 5 kết quả đầu ra có acc cao nhất
    Array.from(predictions)
        .map(function (p, i) {
            return {
                acc: p,
                className: classes[i]
            };
        }).sort(function (a, b) {
            return b.acc - a.acc;
        }).slice(0, num_results).forEach(function (result) {
            results_label.push(result.className);
            results_acc.push((result.acc * 100).toFixed(2));
        });
    // Hiển thị kết quả dự đoán
    document.getElementById("best-result").innerHTML = `Giá trị dự đoán: ${results_label[0]} (Acc: ${results_acc[0]}%, Loss: ${(100 - results_acc[0]).toFixed(2)}%)`;
    // Ẩn loading spin
    hideSpin();
    // Thực hiện di chuyển xuống cuối trang
    scrollDown();
    // Hiển thị biểu đồ kết quả dự đoán
    showChart(results_label, results_acc);
    // Hiển thị nút xem thêm
    showXemThem();
};

async function loadDOM(num) {
    /**
     * Load giao diện Web
     * @param num: Mã project
     */
    // Kiểm tra data về project có lưu trong LocalStorage không ? 
    if (localStorage.getItem(`${project.name}_project`) != null) {
        project = JSON.parse(localStorage.getItem(`${project.name}_project`));
    }
    // Bắt đầu tải nếu chưa lưu 
    else {
        await $.getJSON('static/projects.json', function (data) {
            project = data[num];
            localStorage.setItem(`${project.name}_project`, project);
        });
    }
    // Đặt thông tin cho trang
    $("meta[name='description']").attr("content", project.description);
    $("title").text(project.description);
    $("h4").text(project.description);
    $("a#ds-info").attr("href", project.dataset_url);
    $("a#ds-info").text(project.dataset_name);
    // Tiếp tục tải thông tin các lớp của mô hình
    await loadClasses();
    // Lấy thông tin kích thước ảnh đầu vào mà mô hình yêu cầu
    image_size = project.image_size.split('x');
    image_size = [parseInt(image_size[0]), parseInt(image_size[1])];
};

async function loadClasses() {
    /**
     * Load thông tin các lớp của mô hình
     */
    // Kiểm tra data về classes có lưu trong LocalStorage không ?
    if (localStorage.getItem(`${project.name}_classes`) != null) {
        classes = JSON.parse(localStorage.getItem(`${project.name}_classes`));
        // Nếu chưa có, thực hiện tải lại từ nguồn
    } else {
        await $.get(project.classes, function (data) {
            // Đọc thông tin các lớp từ file txt & tách từng lớp trên từng dòng
            let lines = data.split("\n");
            // Thêm từng lớp vào mảng lưu trữ
            for (let i = 0, len = lines.length; i < len; i++) {
                classes[i] = lines[i];
            }
            // Ghi nhớ mảng lớp tại máy người dùng
            localStorage.setItem(`${project.name}_classes`, JSON.stringify(classes));
        }, 'text');
    }
    // Chỉ nhận tối đa 5 kết quả đầu ra dự đoán nếu nhiều hơn 5 lớp
    num_classes = Object.keys(classes).length;
    if (num_classes <= 5) { num_results = num_classes }

};

function thongBao(message, status) {
    Swal.fire({
        position: 'top-end',
        icon: status,
        title: message,
        showConfirmButton: false,
        timer: 2200,
        toast: true
    })

}

function showChart(results_label, results_acc) {
    // Chart
    let options = {
        noData: {
            text: 'Không có dữ liệu !',
            align: 'center',
            verticalAlign: 'middle',
        },
        series: [{ name: 'Accuracy', data: results_acc }],
        chart: {
            type: 'bar', height: 350
        }, plotOptions: {
            bar: {
                horizontal: false, columnWidth: '55%', endingShape: 'rounded'
            },
        }, dataLabels: {
            enabled: false
        }, stroke: {
            show: true, width: 2, colors: ['transparent']
        }, xaxis: {
            categories: results_label, title: {
                text: 'Labels'
            }
        }, yaxis: {
            title: {
                text: '% (Accuracy)', fontFamily: 'Arial'
            },
            min: 0,
            max: 100,
            decimalsInFloat: 0

        }, fill: {
            opacity: 1
        }, tooltip: {
            y: {
                formatter: function (val) {
                    return val + "%"
                }
            }
        }
    };

    let chart = new ApexCharts(document.getElementById("chart"), options);
    chart.render()
};

function caretUpDown() {
    scrollDown();
    if (!$("#xem-them a").hasClass("collapsed")) {
        $("svg.bi.bi-caret-down").attr("transform", "rotate(180)");
    } else {
        $("svg.bi.bi-caret-down").attr("transform", "rotate(0)");
    }
}
