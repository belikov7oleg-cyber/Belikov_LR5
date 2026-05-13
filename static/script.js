// БЛОК 1: ОБЪЯВЛЕНИЕ ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
// Объект для хранения цветов bounding boxes по классам объектов
var bounding_box_colors = {};
// Текущий ДОСТОВЕРНОСТЬ ПРОГНОЗА пользователя (по умолчанию 60% = 0.6)
var user_confidence = 0.6;
// Доступные цвета для отрисовки bounding boxes
var color_choices = [
  "#C7FC00", "#FF00FF", "#8622FF", "#FE0056", "#00FFCE",
  "#FF8000", "#00B7EB", "#FFFF00", "#0E7AFE", "#FFABAB",
  "#0000FF", "#CCCCCC",
];
// Флаг, указывающий, был ли уже отрисован canvas
var canvas_painted = false;
// Получение ссылок на DOM-элементы canvas и его контекст
var canvas = document.getElementById("video_canvas");
var ctx = canvas.getContext("2d");

// Инициализация движка инференса и идентификатор рабочего потока модели
const inferEngine = new inferencejs.InferenceEngine();
var modelWorkerId = null;
// БЛОК 2: ОСНОВНОЙ ЦИКЛ ДЕТЕКТИРОВАНИЯ ОБЪЕКТОВ
function detectFrame() {
  // Если модель не загружена – продолжаем ожидание
  if (!modelWorkerId) return requestAnimationFrame(detectFrame);
  // Выполнение инференса на текущем кадре видео
  inferEngine.infer(modelWorkerId, new inferencejs.CVImage(video)).then(function(predictions) {
    // При первом запуске – настройка позиционирования canvas
    if (!canvas_painted) {
      var video_start = document.getElementById("video1");
      canvas.top = video_start.top;
      canvas.left = video_start.left;
      canvas.style.top = video_start.top + "px";
      canvas.style.left = video_start.left + "px";
      canvas.style.position = "absolute";
      video_start.style.display = "block";
      canvas.style.display = "absolute";
      canvas_painted = true;
      // Скрытие индикатора загрузки
      var loading = document.getElementById("loading");
      loading.style.display = "none";
    }
    // Запуск следующего кадра (рекурсивно)
    requestAnimationFrame(detectFrame);
    // Очистка canvas перед отрисовкой новых предсказаний
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Если видео существует – отрисовка bounding boxes
    if (video) {
      drawBoundingBoxes(predictions, ctx)
    }
  });
}
// БЛОК 3: ОТРИСОВКА BOUNDING BOXES НА CANVAS
function drawBoundingBoxes(predictions, ctx) {
  // Перебор всех предсказаний
  for (var i = 0; i < predictions.length; i++) {
    var confidence = predictions[i].confidence;
    // Фильтрация по порогу уверенности
    if (confidence < user_confidence) {
      continue
    }
    // Выбор цвета для bounding box (постоянный цвет для каждого класса)
    if (predictions[i].class in bounding_box_colors) {
      ctx.strokeStyle = bounding_box_colors[predictions[i].class];
    } else {
      var color = color_choices[Math.floor(Math.random() * color_choices.length)];
      ctx.strokeStyle = color;
      // Удаление использованного цвета из списка доступных
color_choices.splice(color_choices.indexOf(color), 1);
      bounding_box_colors[predictions[i].class] = color;
    }
    // Вычисление координат прямоугольника (центр → левый верхний угол)
    var prediction = predictions[i];
    var x = prediction.bbox.x - prediction.bbox.width / 2;
    var y = prediction.bbox.y - prediction.bbox.height / 2;
    var width = prediction.bbox.width;
    var height = prediction.bbox.height;
    // Отрисовка прямоугольника
    ctx.rect(x, y, width, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0)";
    ctx.fill();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = "4";
    ctx.strokeRect(x, y, width, height);

    // Отрисовка текста (класс и процент уверенности)
    ctx.font = "25px Arial";
    ctx.fillText(prediction.class + " " + Math.round(confidence * 100) + "%", x, y - 10);
  }
}
// БЛОК 4: ЗАПУСК ВЕБ-КАМЕРЫ И ИНИЦИАЛИЗАЦИЯ МОДЕЛИ
function webcamInference() {
  // Отображение индикатора загрузки
  var loading = document.getElementById("loading");
  loading.style.display = "block";
  // Запрос доступа к веб-камере пользователя
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: "environment" } })
    .then(function(stream) {
      // Создание элемента video для отображения потока с веб-камеры
      video = document.createElement("video");
      video.srcObject = stream;
      video.id = "video1";
      video.style.display = "none";
      video.setAttribute("playsinline", "");
      // Добавление видео в DOM
document.getElementById("video_canvas").after(video);

      // Начало воспроизведения после загрузки метаданных
      video.onloadedmetadata = function() {
        video.play();
      }
      // Настройка размеров видео и canvas после начала воспроизведения
      video.onplay = function() {
        height = video.videoHeight;
        width = video.videoWidth;
        video.width = width;
        video.height = height;
        video.style.width = 640 + "px";
        video.style.height = 480 + "px";
        canvas.style.width = 640 + "px";
        canvas.style.height = 480 + "px";
        canvas.width = width;
        canvas.height = height;
document.getElementById("video_canvas").style.display = "block";
      };
      ctx.scale(1, 1);
      // Загрузка модели Roboflow
      inferEngine.startWorker(MODEL_NAME, MODEL_VERSION, publishable_key, [{ scoreThreshold: CONFIDENCE_THRESHOLD }])
        .then((id) => {
          modelWorkerId = id;  // Сохранение идентификатора рабочего потока
          detectFrame();       // Запуск цикла детектирования
        });
    })
    .catch(function(err) {
      console.log(err);  // Обработка ошибок (например, отказ в доступе к камере)
    });
}
// БЛОК 5: ОБРАБОТКА ИЗМЕНЕНИЯ ДОСТОВЕРНОСТИ ПРОГНОЗА
function changeConfidence () {
  // Преобразование значения из ползунка (1-100) в дробное число (0-1)
  user_confidence = document.getElementById("confidence").value / 100;
}
// Регистрация обработчика события изменения ползунка
document.getElementById("confidence").addEventListener("input", changeConfidence);
// БЛОК 6: ЗАПУСК ПРИЛОЖЕНИЯ
// Старт веб-камеры и инициализация модели
webcamInference();
