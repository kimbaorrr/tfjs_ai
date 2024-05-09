var project = {};
var classes = {};
var num_classes = undefined;
var max_results = 5;

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
    if (num_classes <= 5) { max_results = num_classes }
};

function thongBao(message, status) {
    /**
     * Hiện thông báo
     * message: Nội dung
     * status: Trạng thái thực thi
     */
    Swal.fire({
        position: 'top-end',
        icon: status,
        title: message,
        showConfirmButton: false,
        timer: 2200,
        toast: true
    })

}
