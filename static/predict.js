var project = {};
var classes = {};
var num_classes = undefined;
var num_results = 5;
var model = undefined;
var image_size = [];
var img = document.getElementById('img-to-show');


async function loadModel() {
    try {
        loadSpin();
        scrollDown();
        model = await tf.loadLayersModel(project.model);
    } catch (e) {
        alert(`Có lỗi khi tải mô hình. Thử tải lại trang !\n${e.message}`);
        console.error(e.message);
    }
};

function loadImage(event) {
    file = event.target.files[0];
    if (file.type.split('/')[0] !== 'image') {
        alert('Tệp tải lên phải là một ảnh !');
        return;
    }
    if (file.size > 10000000) {
        alert('Dung lượng của ảnh phải < 10MB !');
        return;
    }
    img.src = URL.createObjectURL(file);
    img.width, img.height = image_size;
};

function preProcessingImage() {
    let offset = tf.scalar(127);
    let tensor = tf.browser.fromPixels(img)
        .resizeNearestNeighbor(image_size)
        .toFloat().sub(offset).div(offset).expandDims(0);
    return tensor;
};

function loadSpin() {
    document.getElementById("best-result").style.display = "none";
    document.getElementById("loading-spin").style.display = "block";
}

function hideSpin() {
    document.getElementById("best-result").style.display = "block";
    document.getElementById("loading-spin").style.display = "none";
}

function scrollDown() {
    let x = $(window).scrollTop();
    $('html, body').animate({ scrollTop: x + 600 })
}
async function predictImage() {
    await loadModel();
    let tensor = preProcessingImage();
    let predictions = await model.predict(tensor).data();
    let results = Array.from(predictions)
        .map(function (p, i) {
            return {
                acc: p,
                className: classes[i]
            };
        }).sort(function (a, b) {
            return b.acc - a.acc;
        }).slice(0, num_results);
    document.getElementById("best-result").innerHTML = `Giá trị dự đoán: ${results[0].className} (Acc: ${results[0].acc.toFixed(2)}, Loss: ${(1 - results[0].acc).toFixed(2)})`;
    hideSpin();
    scrollDown();
    //jsonChart(results);
    document.getElementById('xem-them').style.display = 'block';
};


async function loadDOM(num) {
    await $.getJSON('static/projects.json', function (data) {
        project = data[num];
        $("meta[name='description']").attr("content", project.description);
        $("title").text(project.description);
        $("h4").text(project.description);
        $("a#ds-info").attr("href", project.dataset_url);
        $("a#ds-info").text(project.dataset_name);
    });
    await loadClasses();
    image_size = project.image_size.split('x');
    image_size = [parseInt(image_size[0]), parseInt(image_size[1])];
};

async function loadClasses() {
    if (localStorage.getItem(`${project.name}_classes`) != null) {
        classes = JSON.parse(localStorage.getItem(`${project.name}_classes`));
    } else {
        await $.get(project.classes, function (data) {
            let lines = data.split("\n");
            for (let i = 0, len = lines.length; i < len; i++) {
                classes[i] = lines[i];
            }
            localStorage.setItem(`${project.name}_classes`, JSON.stringify(classes));
        }, 'text');
    }
    num_classes = Object.keys(classes).length;
    if (num_classes <= 5) { num_results = num_classes }

};

// function jsonChart(results) {
//     // Xem_them
//     $('.scroll-down').click(function () {
//         let x = $(window).scrollTop();
//         $('html, body').animate({ scrollTop: x + 600 })
//     });
//     // Chart
//     let chart_data = JSON.stringify(results);
//     console.log(chart_data);
//     let options = {
//         noData: {
//             text: 'Không có dữ liệu !',
//             align: 'center',
//             verticalAlign: 'middle',
//         },
//         series: [{
//             name: 'Accuracy', data: chart_data['acc']
//         }], chart: {
//             type: 'bar', height: 350
//         }, plotOptions: {
//             bar: {
//                 horizontal: false, columnWidth: '55%', endingShape: 'rounded'
//             },
//         }, dataLabels: {
//             enabled: false
//         }, stroke: {
//             show: true, width: 2, colors: ['transparent']
//         }, xaxis: {
//             categories: chart_data['className'], title: {
//                 text: 'Labels'
//             }
//         }, yaxis: {
//             title: {
//                 text: '% (Accuracy)', fontFamily: 'Arial'
//             },
//             min: 0,
//             max: 100,
//             decimalsInFloat: 0

//         }, fill: {
//             opacity: 1
//         }, tooltip: {
//             y: {
//                 formatter: function (val) {
//                     return val + "%"
//                 }
//             }
//         }
//     };
//     new ApexCharts(document.getElementById("#chart"), options).render();
// };

