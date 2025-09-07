class PipeFitApp {
    constructor() {
        this.exercises = this.loadFromStorage('exercises', []);
        this.workouts = this.loadFromStorage('workouts', []);

        this.exercises = JSON.parse(localStorage.getItem('exercises')) || [];
        this.workouts = JSON.parse(localStorage.getItem('workouts')) || [];
        this.currentWorkout = null;
        this.currentExerciseIndex = 0;
        this.currentCycle = 1;
        this.isRunning = false;
        this.timerInterval = null;
        this.remainingTime = 0;
        
        this.totalWorkoutTime = 0;
        this.remainingWorkoutTime = 0;

        this.init();

        this.isAutoPause = true;
        this.pauseDuration = 10;
        this.pauseTimer = null;
        this.isPauseCountdown = false;
        this.pauseCountdownTime = 0;
        
        this.setupSoundSettings();

        this.registerServiceWorker();
        this.setupSwipeGestures();
    }

    setupSwipeGestures() {
        let startX, startY;
        const minSwipeDistance = 50;

        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        });

        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = endX - startX;
            const diffY = endY - startY;

            // Проверяем, что это горизонтальный свайп
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
                if (diffX > 0) {
                    this.swipeRight();
                } else {
                    this.swipeLeft();
                }
            }

            startX = startY = null;
        });
    }

    swipeLeft() {
        const tabs = ['elements', 'workout', 'current'];
        const currentTab = document.querySelector('.nav-btn.active').dataset.tab;
        const currentIndex = tabs.indexOf(currentTab);
        
        if (currentIndex < tabs.length - 1) {
            this.switchTab(tabs[currentIndex + 1]);
        }
    }

    swipeRight() {
        const tabs = ['elements', 'workout', 'current'];
        const currentTab = document.querySelector('.nav-btn.active').dataset.tab;
        const currentIndex = tabs.indexOf(currentTab);
        
        if (currentIndex > 0) {
            this.switchTab(tabs[currentIndex - 1]);
        }
    }

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('SW registered: ', registration);
                })
                .catch(error => {
                    console.log('SW registration failed: ', error);
                });
        }
    }

    loadFromStorage(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return defaultValue;
        }
    }

    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка сохранения в localStorage:', error);
        }
    }

    init() {
        this.setupEventListeners();
        this.renderExercises();
        this.renderSavedWorkouts();
    }

    setupSoundSettings() {
        // Загрузка настроек из localStorage
        this.isAutoPause = localStorage.getItem('autoPause') !== 'false';
        this.pauseDuration = parseInt(localStorage.getItem('pauseDuration')) || 10;
        
        // Установка значений в форму
        document.getElementById('auto-pause').checked = this.isAutoPause;
        document.getElementById('pause-duration').value = this.pauseDuration;
        
        // Обработчики изменений настроек
        document.getElementById('auto-pause').addEventListener('change', (e) => {
            this.isAutoPause = e.target.checked;
            localStorage.setItem('autoPause', this.isAutoPause);
        });
        
        document.getElementById('pause-duration').addEventListener('change', (e) => {
            this.pauseDuration = parseInt(e.target.value) || 10;
            localStorage.setItem('pauseDuration', this.pauseDuration);
        });
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Переключение циклической тренировки
        document.getElementById('is-circular').addEventListener('change', (e) => {
            document.getElementById('cycles-count').disabled = !e.target.checked;
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    addExercise(name, duration) {
        if (!name || !duration) {
            alert('Заполните все поля');
            return;
        }

        const exercise = {
            id: Date.now(),
            name: name.trim(),
            duration: parseInt(duration)
        };

        this.exercises.push(exercise);
        this.saveExercises();
        this.renderExercises();

        document.getElementById('exercise-name').value = '';
        document.getElementById('exercise-duration').value = '';
    }

    deleteExercise(id) {
        this.exercises = this.exercises.filter(ex => ex.id !== id);
        this.saveExercises();
        this.renderExercises();
    }

    saveExercises() {
        localStorage.setItem('exercises', JSON.stringify(this.exercises));
        this.saveToStorage('exercises', this.exercises);
    }

    renderExercises() {
        const container = document.getElementById('elements-list');
        container.innerHTML = '';

        this.exercises.forEach(exercise => {
            const div = document.createElement('div');
            div.className = 'exercise-item';
            div.innerHTML = `
                <div class="exercise-info">
                    <div class="exercise-name">${exercise.name}</div>
                    <div class="exercise-duration">${exercise.duration} сек</div>
                </div>
                <div class="actions">
                    <button onclick="app.addToWorkout(${exercise.id}, 1)">+</button>
                    <button onclick="app.deleteExercise(${exercise.id})">×</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    addToWorkout(exerciseId, cycles = 1) {
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const container = document.getElementById('workout-elements');
        const div = document.createElement('div');
        div.className = `exercise-item ${cycles > 1 ? 'exercise-with-cycles' : ''}`;
        div.dataset.id = exerciseId;
        div.dataset.cycles = cycles;
        div.innerHTML = `
            <div class="exercise-info">
                <div class="exercise-name">
                    ${exercise.name}
                    ${cycles > 1 ? `<span class="cycle-badge">${cycles} раз</span>` : ''}
                </div>
                <div class="exercise-duration">${exercise.duration} сек</div>
            </div>
            <div class="actions">
                <button onclick="app.changeCycles(${exerciseId}, ${cycles + 1})">+1</button>
                <button onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        container.appendChild(div);
    }

    changeCycles(exerciseId, newCycles) {
        const item = Array.from(document.getElementById('workout-elements').children)
            .find(item => parseInt(item.dataset.id) === exerciseId);
        
        if (item) {
            item.dataset.cycles = newCycles;
            const exercise = this.exercises.find(ex => ex.id === exerciseId);
            
            item.innerHTML = `
                <div class="exercise-info">
                    <div class="exercise-name">
                        ${exercise.name}
                        ${newCycles > 1 ? `<span class="cycle-badge">${newCycles} раз</span>` : ''}
                    </div>
                    <div class="exercise-duration">${exercise.duration} сек</div>
                </div>
                <div class="actions">
                    <button onclick="app.changeCycles(${exerciseId}, ${newCycles + 1})">+1</button>
                    <button onclick="this.parentElement.parentElement.remove()">×</button>
                </div>
            `;
        }
    }

    createWorkout() {
        const name = document.getElementById('workout-name').value.trim();
        if (!name) {
            alert('Введите название тренировки');
            return;
        }

        const workoutElements = Array.from(document.getElementById('workout-elements').children);
        if (workoutElements.length === 0) {
            alert('Добавьте упражнения в тренировку');
            return;
        }

        const isCircular = document.getElementById('is-circular').checked;
        const cyclesCount = parseInt(document.getElementById('cycles-count').value) || 1;

        // Создаем плоский список упражнений с учетом повторений
        const flatExercises = [];
        workoutElements.forEach(item => {
            const exerciseId = parseInt(item.dataset.id);
            const cycles = parseInt(item.dataset.cycles) || 1;
            const exercise = this.exercises.find(ex => ex.id === exerciseId);
            
            if (exercise) {
                for (let i = 0; i < cycles; i++) {
                    flatExercises.push({
                        ...exercise,
                        originalCycles: cycles,
                        currentCycle: i + 1
                    });
                }
            }
        });

        const workout = {
            id: Date.now(),
            name: name,
            exercises: flatExercises,
            isCircular: isCircular,
            totalCycles: isCircular ? cyclesCount : 1,
            currentCycle: 1,
            createdAt: new Date().toISOString()
        };

        this.workouts.push(workout);
        this.saveWorkouts();
        this.renderSavedWorkouts();

        document.getElementById('workout-name').value = '';
        document.getElementById('workout-elements').innerHTML = '';
        document.getElementById('is-circular').checked = false;
        document.getElementById('cycles-count').disabled = true;
        document.getElementById('cycles-count').value = '1';
        
        alert('Тренировка сохранена!');
    }

    saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(this.workouts));
        this.saveToStorage('workouts', this.workouts);
    }

    renderSavedWorkouts() {
        const container = document.getElementById('saved-workouts-list');
        container.innerHTML = '';

        this.workouts.forEach(workout => {
            const div = document.createElement('div');
            div.className = 'workout-item';
            div.innerHTML = `
                <h4>${workout.name}</h4>
                <p>${workout.exercises.length} упражнений</p>
                ${workout.isCircular ? `<p class="exercise-reps">${workout.totalCycles} кругов</p>` : ''}
                <button onclick="app.startSelectedWorkout(${workout.id})">Начать</button>
                <button onclick="app.deleteWorkout(${workout.id})">Удалить</button>
            `;
            container.appendChild(div);
        });
    }

    deleteWorkout(id) {
        this.workouts = this.workouts.filter(workout => workout.id !== id);
        this.saveWorkouts();
        this.renderSavedWorkouts();
    }

    startSelectedWorkout(workoutId) {
        const workout = this.workouts.find(w => w.id === workoutId);
        if (!workout) return;

        this.currentWorkout = JSON.parse(JSON.stringify(workout));
        this.currentExerciseIndex = 0;
        this.currentCycle = 1;
        this.isRunning = false;

        // Рассчитываем общее время
        this.totalWorkoutTime = this.calculateWorkoutTime();
        this.remainingWorkoutTime = this.totalWorkoutTime;

        this.updateTimeDisplay();
        this.switchTab('current');
        this.updateCurrentWorkoutDisplay();
    }

    startWorkout() {
        if (!this.currentWorkout) return;

        this.isRunning = true;
        this.updateButtons();

        const currentExercise = this.currentWorkout.exercises[this.currentExerciseIndex];
        this.remainingTime = currentExercise.duration;
        this.startTimer();
    }

    pauseWorkout() {
        this.isRunning = false;
        this.isPauseCountdown = false;
        clearInterval(this.timerInterval);
        clearInterval(this.pauseTimer);
        
        const countdownElement = document.getElementById('pause-countdown');
        if (countdownElement) countdownElement.remove();
        
        this.updateButtons();
    }

    stopWorkout() {
        this.isRunning = false;
        this.isPauseCountdown = false;
        clearInterval(this.timerInterval);
        clearInterval(this.pauseTimer);
        
        // Удаляем элемент обратного отсчета если есть
        const countdownElement = document.getElementById('pause-countdown');
        if (countdownElement) countdownElement.remove();
        
        this.currentExerciseIndex = 0;
        this.currentCycle = 1;
        this.remainingWorkoutTime = this.calculateWorkoutTime();
        this.updateTimeDisplay();
        this.updateCurrentWorkoutDisplay();
        this.updateButtons();
    }

    async nextExercise() {
        // Вычитаем оставшееся время текущего упражнения
        if (this.remainingTime > 0) {
            this.remainingWorkoutTime -= this.remainingTime;
            this.remainingTime = 0;
        }
        
        // Воспроизводим звук завершения упражнения
        this.playCompletionSoundPause();
        
        // Если включена автопауза и это не последнее упражнение
        if (this.isAutoPause && !this.isLastExercise()) {
            await this.startAutoPause();
        }
        
        this.currentExerciseIndex++;
        
        if (this.currentExerciseIndex >= this.currentWorkout.exercises.length) {
            this.currentCycle++;
            
            if (this.currentCycle > this.currentWorkout.totalCycles) {
                this.stopWorkout();
                this.playCompletionSoundStop();
                return;
            }
            
            this.currentExerciseIndex = 0;
        }

        this.updateCurrentWorkoutDisplay();
        this.updateTimeDisplay();
        
        if (this.isRunning && !this.isPauseCountdown) {
            const currentExercise = this.currentWorkout.exercises[this.currentExerciseIndex];
            this.remainingTime = currentExercise.duration;
            this.startTimer();
        }
    }

        isLastExercise() {
        return this.currentExerciseIndex === this.currentWorkout.exercises.length - 1 &&
               this.currentCycle === this.currentWorkout.totalCycles;
    }

    playCompletionSoundPause() {
        const sound = document.getElementById('notification-sound-pause');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Не удалось воспроизвести звук:', e));
        }
        
        // Визуальная анимация
        const exerciseElement = document.getElementById('current-exercise');
        exerciseElement.classList.add('exercise-complete');
        setTimeout(() => exerciseElement.classList.remove('exercise-complete'), 1000);
    }

    playCompletionSoundStop() {
        const sound = document.getElementById('notification-sound-stop');
        if (sound) {
            sound.currentTime = 0;
            sound.play().catch(e => console.log('Не удалось воспроизвести звук:', e));
        }
        
        // Визуальная анимация
        const exerciseElement = document.getElementById('current-exercise');
        exerciseElement.classList.add('exercise-complete');
        setTimeout(() => exerciseElement.classList.remove('exercise-complete'), 1000);
    }

    async startAutoPause() {
        this.isPauseCountdown = true;
        this.pauseCountdownTime = this.pauseDuration;
        
        // Останавливаем основной таймер
        clearInterval(this.timerInterval);
        this.isRunning = false;
        this.updateButtons();
        
        // Создаем элемент для отображения обратного отсчета
        let countdownElement = document.getElementById('pause-countdown');
        if (!countdownElement) {
            countdownElement = document.createElement('div');
            countdownElement.id = 'pause-countdown';
            countdownElement.className = 'pause-countdown';
            document.querySelector('.current-workout').insertBefore(
                countdownElement, 
                document.querySelector('.controls')
            );
        }
        
        // Обратный отсчет паузы
        return new Promise((resolve) => {
            const pauseInterval = setInterval(() => {
                countdownElement.textContent = `Пауза: ${this.pauseCountdownTime} сек...`;
                countdownElement.classList.add('sound-on');
                setTimeout(() => countdownElement.classList.remove('sound-on'), 500);
                
                if (this.pauseCountdownTime <= 0) {
                    clearInterval(pauseInterval);
                    countdownElement.remove();
                    this.isPauseCountdown = false;
                    resolve();
                }
                
                this.pauseCountdownTime--;
            }, 1000);
        });
    }

    // Замените метод startTimer
    startTimer() {
        if (this.isPauseCountdown) return;
        
        clearInterval(this.timerInterval);
        this.updateTimerDisplay();
        this.updateTimeDisplay();

        let lastUpdateTime = Date.now();
        
        this.timerInterval = setInterval(() => {
            if (this.isPauseCountdown) {
                clearInterval(this.timerInterval);
                return;
            }
            
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - lastUpdateTime) / 1000);
            
            if (elapsedSeconds >= 1) {
                this.remainingTime -= elapsedSeconds;
                this.remainingWorkoutTime -= elapsedSeconds;
                lastUpdateTime = now;
                
                this.updateTimerDisplay();
                this.updateTimeDisplay();

                if (this.remainingTime <= 0) {
                    const overtime = Math.abs(this.remainingTime);
                    this.remainingTime = 0;
                    this.remainingWorkoutTime = Math.max(0, this.remainingWorkoutTime - overtime);
                    
                    clearInterval(this.timerInterval);
                    this.updateTimerDisplay();
                    this.updateTimeDisplay();
                    
                    setTimeout(() => this.nextExercise(), 500);
                }
                
                if (this.remainingWorkoutTime <= 0) {
                    this.remainingWorkoutTime = 0;
                    this.updateTimeDisplay();
                    
                    if (this.isRunning) {
                        this.stopWorkout();
                    }
                }
            }
        }, 100);
    }

    updateTimerDisplay() {
        const minutes = Math.floor(this.remainingTime / 60);
        const seconds = this.remainingTime % 60;
        document.getElementById('timer').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    updateCurrentWorkoutDisplay() {
        if (!this.currentWorkout) return;

        document.getElementById('current-workout-name').textContent = this.currentWorkout.name;
        
        // Обновляем информацию о круге
        const cycleInfo = document.getElementById('cycle-info');
        if (this.currentWorkout.isCircular) {
            cycleInfo.style.display = 'block';
            document.getElementById('current-cycle').textContent = 
                `Круг: ${this.currentCycle}/${this.currentWorkout.totalCycles}`;
        } else {
            cycleInfo.style.display = 'none';
        }

        if (this.currentExerciseIndex < this.currentWorkout.exercises.length) {
            const currentExercise = this.currentWorkout.exercises[this.currentExerciseIndex];
            document.getElementById('exercise-title').textContent = currentExercise.name;
            
            // Показываем номер повторения, если упражнение повторяется
            let timeText = `${currentExercise.duration} сек`;
            if (currentExercise.originalCycles > 1) {
                timeText += ` (Повторение ${currentExercise.currentCycle}/${currentExercise.originalCycles})`;
            }
            document.getElementById('exercise-time').textContent = timeText;
        }

        this.updateProgress();
        this.renderUpcomingExercises();
    }

    updateProgress() {
        if (!this.currentWorkout) return;
        
        const totalExercises = this.currentWorkout.exercises.length * this.currentWorkout.totalCycles;
        const completedExercises = (this.currentCycle - 1) * this.currentWorkout.exercises.length + this.currentExerciseIndex;
        const progress = (completedExercises / totalExercises) * 100;
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = 
            `${completedExercises}/${totalExercises}`;
    }

    renderUpcomingExercises() {
        const container = document.getElementById('upcoming-exercises');
        container.innerHTML = '<h3>Предстоящие упражнения:</h3>';

        // Показываем следующие 5 упражнений
        const upcomingExercises = [];
        let remainingInCycle = this.currentWorkout.exercises.length - this.currentExerciseIndex - 1;
        
        // Упражнения в текущем круге
        for (let i = this.currentExerciseIndex + 1; i < this.currentWorkout.exercises.length && upcomingExercises.length < 5; i++) {
            upcomingExercises.push({
                exercise: this.currentWorkout.exercises[i],
                cycle: this.currentCycle
            });
        }

        // Упражнения в следующих кругах
        for (let cycle = this.currentCycle + 1; cycle <= this.currentWorkout.totalCycles && upcomingExercises.length < 5; cycle++) {
            for (let i = 0; i < this.currentWorkout.exercises.length && upcomingExercises.length < 5; i++) {
                upcomingExercises.push({
                    exercise: this.currentWorkout.exercises[i],
                    cycle: cycle
                });
            }
        }

        upcomingExercises.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'upcoming-item' + (index === 0 ? ' next' : '');
            
            let text = item.exercise.name;
            if (this.currentWorkout.isCircular) {
                text += ` (Круг ${item.cycle})`;
            }
            if (item.exercise.originalCycles > 1) {
                text += ` [${item.exercise.originalCycles} раз]`;
            }
            
            div.innerHTML = `<strong>${text}</strong> - ${item.exercise.duration} сек`;
            container.appendChild(div);
        });
    }

    updateButtons() {
        document.getElementById('start-btn').disabled = this.isRunning;
        document.getElementById('pause-btn').disabled = !this.isRunning;
        document.getElementById('next-btn').disabled = !this.isRunning;
        document.getElementById('stop-btn').disabled = !this.isRunning && this.currentExerciseIndex === 0 && this.currentCycle === 1;
    }

    calculateWorkoutTime() {
        if (!this.currentWorkout) return 0;
        
        let totalTime = 0;
        this.currentWorkout.exercises.forEach(exercise => {
            totalTime += exercise.duration;
        });
        
        // Умножаем на количество кругов
        return totalTime * this.currentWorkout.totalCycles;
    }

    updateTimeDisplay() {
        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        document.getElementById('total-time').textContent = formatTime(this.totalWorkoutTime);
        document.getElementById('remaining-time').textContent = formatTime(this.remainingWorkoutTime);
    }

        // Добавьте методы экспорта
    exportToFile(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    exportElements() {
        if (this.exercises.length === 0) {
            alert('Нет элементов для экспорта');
            return;
        }
        this.exportToFile(this.exercises, 'workout-elements.json');
    }

    exportWorkouts() {
        if (this.workouts.length === 0) {
            alert('Нет тренировок для экспорта');
            return;
        }
        this.exportToFile(this.workouts, 'workout-programs.json');
    }

    // Добавьте методы импорта
    importFromFile(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Валидация данных
                if (!Array.isArray(data)) {
                    throw new Error('Файл должен содержать массив данных');
                }

                if (type === 'elements') {
                    this.importElementsData(data);
                } else if (type === 'workouts') {
                    this.importWorkoutsData(data);
                }

            } catch (error) {
                this.showImportError(`Ошибка импорта: ${error.message}`);
            }
        };

        reader.onerror = () => {
            this.showImportError('Ошибка чтения файла');
        };

        reader.readAsText(file);
        // Сбрасываем input чтобы можно было выбрать тот же файл снова
        event.target.value = '';
    }

    importElements(data) {
        this.importFromFile(event, 'elements');
    }

    importWorkouts(data) {
        this.importFromFile(event, 'workouts');
    }

    importElementsData(data) {
        // Валидация структуры элементов
        const validElements = data.filter(item => 
            item && 
            typeof item.name === 'string' && 
            typeof item.duration === 'number' &&
            item.duration > 0
        );

        if (validElements.length === 0) {
            this.showImportError('Не найдено валидных элементов в файле');
            return;
        }

        // Добавляем новые элементы (исключая дубликаты по имени)
        let addedCount = 0;
        validElements.forEach(newElement => {
            const exists = this.exercises.some(ex => 
                ex.name.toLowerCase() === newElement.name.toLowerCase()
            );
            
            if (!exists) {
                this.exercises.push({
                    ...newElement,
                    id: Date.now() + Math.random() // Уникальный ID
                });
                addedCount++;
            }
        });

        this.saveExercises();
        this.renderExercises();
        this.showImportSuccess(`Импортировано ${addedCount} новых элементов`);
    }

    importWorkoutsData(data) {
        // Валидация структуры тренировок
        const validWorkouts = data.filter(item => 
            item &&
            typeof item.name === 'string' &&
            Array.isArray(item.exercises) &&
            item.exercises.length > 0
        );

        if (validWorkouts.length === 0) {
            this.showImportError('Не найдено валидных тренировок в файле');
            return;
        }

        // Добавляем новые тренировки (исключая дубликаты по имени)
        let addedCount = 0;
        validWorkouts.forEach(newWorkout => {
            const exists = this.workouts.some(workout => 
                workout.name.toLowerCase() === newWorkout.name.toLowerCase()
            );
            
            if (!exists) {
                this.workouts.push({
                    ...newWorkout,
                    id: Date.now() + Math.random(), // Уникальный ID
                    createdAt: new Date().toISOString()
                });
                addedCount++;
            }
        });

        this.saveWorkouts();
        this.renderSavedWorkouts();
        this.showImportSuccess(`Импортировано ${addedCount} новых тренировок`);
    }

    showImportSuccess(message) {
        this.showImportMessage(message, 'import-success');
    }

    showImportError(message) {
        this.showImportMessage(message, 'import-error');
    }

    showImportMessage(message, className) {
        // Удаляем предыдущие сообщения
        document.querySelectorAll('.import-message').forEach(el => el.remove());
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `import-message ${className}`;
        messageDiv.textContent = message;
        
        // Добавляем сообщение в текущую активную вкладку
        const activeTab = document.querySelector('.tab-content.active');
        activeTab.insertBefore(messageDiv, activeTab.firstChild);
        
        // Автоудаление через 5 секунд
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Добавьте метод для создания резервной копии всех данных
    exportAllData() {
        const allData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            exercises: this.exercises,
            workouts: this.workouts
        };
        
        this.exportToFile(allData, 'workout-backup.json');
    }

    // Добавьте метод для импорта полной резервной копии
    importBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.exercises && Array.isArray(data.exercises)) {
                    this.exercises = data.exercises;
                    this.saveExercises();
                    this.renderExercises();
                }
                
                if (data.workouts && Array.isArray(data.workouts)) {
                    this.workouts = data.workouts;
                    this.saveWorkouts();
                    this.renderSavedWorkouts();
                }
                
                this.showImportSuccess('Резервная копия успешно восстановлена');
                
            } catch (error) {
                this.showImportError('Ошибка восстановления резервной копии');
            }
        };
        
        reader.readAsText(file);
    }
}

// Глобальные функции для вызовов из HTML
function addExercise() {
    const name = document.getElementById('exercise-name').value;
    const duration = document.getElementById('exercise-duration').value;
    app.addExercise(name, duration);
}

function createWorkout() {
    app.createWorkout();
}

function startWorkout() {
    app.startWorkout();
}

function pauseWorkout() {
    app.pauseWorkout();
}

function nextExercise() {
    app.nextExercise();
}

function stopWorkout() {
    app.stopWorkout();
}

// Инициализация приложения
const app = new PipeFitApp();