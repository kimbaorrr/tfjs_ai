var model = undefined;
var image_size = [];
var img = $("#img-to-show")[0];

function loadSpin() {
    /**
     * Hiện circle loadings
     */
    $("#best-result").hide();
    $("#loading-spin").show();
}

function hideSpin() {
    /**
     * Ẩn circle loadings
     */
    $("#best-result").show();
    $("#loading-spin").hide();
}

function enablePredBtn() {
    $("#pred-btn").prop("disabled", false);
}

function disablePredBtn() {
    $("#pred-btn").prop("disabled", true);
}

function hideXemThem() {
    $("#xem-them").hide();
}

function showXemThem() {
    $("#xem-them").show();
}

function scrollDown() {
    let x = $(window).scrollTop();
    $('html, body').animate({ scrollTop: x + 600 })
}

function caretUpDown() {
    /**
     * Chuyển đổi hướng caret
     */
    scrollDown();
    // Nếu chưa click vào xem thêm thì caret ở góc 90 & ngược lại
    let caretUpDown = $("#xem-them svg.bi.bi-caret-down");
    if (!$("#xem-them a").hasClass("collapsed")) {
        caretUpDown.attr("transform", "rotate(180)");
    } else {
        caretUpDown.attr("transform", "rotate(0)");
    }
}


async function loadModel() {
    /**
     * Tải mô hình
     */
    try {
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

async function predictImage() {
    /**
     * Dự đoán ảnh đầu vào & xuất kết quả dự đoán
     */
    // Clear data cũ
    let results_label = [];
    let results_acc = [];
    // Hiện circle loading
    scrollDown();
    loadSpin();
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
        }).slice(0, max_results).forEach(function (result) {
            results_label.push(result.className);
            results_acc.push((result.acc * 100).toFixed(2));
        });
    // Hiển thị kết quả dự đoán
    $("#best-result").text(`Giá trị dự đoán: ${results_label[0]} (Acc: ${results_acc[0]}%, Loss: ${(100 - results_acc[0]).toFixed(2)}%)`);
    // Ẩn loading spin
    hideSpin();
    // Thực hiện di chuyển xuống cuối trang
    scrollDown();
    // Hiển thị biểu đồ kết quả dự đoán
    showChart(results_label, results_acc);
    // Hiển thị nút xem thêm
    showXemThem();
};


function showChart(results_label, results_acc) {
    /**
     * Hiển thị biểu đồ dự đoán
     * results_label: Tập nhãn đầu ra dự đoán
     * results_acc: Tập ghi nhận độ tin cậy của đầu ra
     */
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
    // Bắt đầu vẽ biểu đồ
    new ApexCharts($("#chart")[0], options).render();
};