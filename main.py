# БЛОК 1: ИМПОРТ БИБЛИОТЕК И НАСТРОЙКА ПРИЛОЖЕНИЯ
from flask import Flask, render_template
# Создание экземпляра Flask-приложения
app = Flask(__name__)
# БЛОК 2: МАРШРУТИЗАЦИЯ (ОПРЕДЕЛЕНИЕ URL-ПУТЕЙ)
# Декоратор связывает URL-путь "/" с функцией hello_world
@app.route('/')
def hello_world():
    # render_template() загружает и обрабатывает HTML-шаблон из папки templates/
    return render_template("index.html")
# БЛОК 3: ЗАПУСК СЕРВЕРА
# Запуск приложения на всех доступных сетевых интерфейсах (0.0.0.0) на порту 5000 (по умолчанию)
app.run("0.0.0.0")
