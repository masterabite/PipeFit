class WorkoutApp {
    constructor() {
        this.exercises = JSON.parse(localStorage.getItem('exercises')) || [];
        this.workouts = JSON.parse(localStorage.getItem('workouts')) || [];
        this.currentWorkout = null;
        this.currentExerciseIndex = 0;
        this.isRunning = false;
        this.timerInterval = null;
        this.remainingTime = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderExercises();
        this.renderSavedWorkouts();
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        // Деактивируем все кнопки и вкладки
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Активируем выбранные
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

        // Очищаем поля ввода
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
                    <button onclick="app.addToWorkout(${exercise.id})">+</button>
                    <button onclick="app.deleteExercise(${exercise.id})">×</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    addToWorkout(exerciseId) {
        const exercise = this.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;

        const container = document.getElementById('workout-elements');
        const div = document.createElement('div');
        div.className = 'exercise-item';
        div.dataset.id = exerciseId;
        div.innerHTML = `
            <div class="exercise-info">
                <div class="exercise-name">${exercise.name}</div>
                <div class="exercise-duration">${exercise.duration} сек</div>
            </div>
            <button onclick="this.parentElement.remove()">×</button>
        `;
        container.appendChild(div);
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

        const exercises = workoutElements.map(item => {
            const exerciseId = parseInt(item.dataset.id);
            return this.exercises.find(ex => ex.id === exerciseId);
        }).filter(ex => ex);

        const workout = {
            id: Date.now(),
            name: name,
            exercises: exercises,
            createdAt: new Date().toISOString()
        };

        this.workouts.push(workout);
        this.saveWorkouts();
        this.renderSavedWorkouts();

        // Очищаем форму
        document.getElementById('workout-name').value = '';
        document.getElementById('workout-elements').innerHTML = '';
        
        alert('Тренировка сохранена!');
    }

    saveWorkouts() {
        localStorage.setItem('workouts', JSON.stringify(this.workouts));
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

        this.currentWorkout = workout;
        this.currentExerciseIndex = 0;
        this.isRunning = false;

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
        clearInterval(this.timerInterval);
        this.updateButtons();
    }

    stopWorkout() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        this.currentExerciseIndex = 0;
        this.updateCurrentWorkoutDisplay();
        this.updateButtons();
    }

    nextExercise() {
        this.currentExerciseIndex++;
        if (this.currentExerciseIndex >= this.currentWorkout.exercises.length) {
            this.stopWorkout();
            alert('Тренировка завершена!');
            return;
        }

        this.updateCurrentWorkoutDisplay();
        if (this.isRunning) {
            const currentExercise = this.currentWorkout.exercises[this.currentExerciseIndex];
            this.remainingTime = currentExercise.duration;
            this.startTimer();
        }
    }

    startTimer() {
        clearInterval(this.timerInterval);
        this.updateTimerDisplay();

        this.timerInterval = setInterval(() => {
            this.remainingTime--;
            this.updateTimerDisplay();

            if (this.remainingTime <= 0) {
                clearInterval(this.timerInterval);
                setTimeout(() => this.nextExercise(), 1000);
            }
        }, 1000);
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
        
        if (this.currentExerciseIndex < this.currentWorkout.exercises.length) {
            const currentExercise = this.currentWorkout.exercises[this.currentExerciseIndex];
            document.getElementById('exercise-title').textContent = currentExercise.name;
            document.getElementById('exercise-time').textContent = `${currentExercise.duration} сек`;
        }

        this.updateProgress();
        this.renderUpcomingExercises();
    }

    updateProgress() {
        const progress = ((this.currentExerciseIndex + 1) / this.currentWorkout.exercises.length) * 100;
        document.getElementById('progress-fill').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = 
            `${this.currentExerciseIndex + 1}/${this.currentWorkout.exercises.length}`;
    }

    renderUpcomingExercises() {
        const container = document.getElementById('upcoming-exercises');
        container.innerHTML = '<h3>Предстоящие упражнения:</h3>';

        this.currentWorkout.exercises.slice(this.currentExerciseIndex + 1).forEach((exercise, index) => {
            const div = document.createElement('div');
            div.className = 'upcoming-item' + (index === 0 ? ' next' : '');
            div.innerHTML = `
                <strong>${exercise.name}</strong> - ${exercise.duration} сек
            `;
            container.appendChild(div);
        });
    }

    updateButtons() {
        document.getElementById('start-btn').disabled = this.isRunning;
        document.getElementById('pause-btn').disabled = !this.isRunning;
        document.getElementById('next-btn').disabled = !this.isRunning;
        document.getElementById('stop-btn').disabled = !this.isRunning && this.currentExerciseIndex === 0;
    }
}

// Глобальные функции для вызовов из HTML
function addExercise() {
    const name = document.getElementById('exercise-name').value;
    const duration = document.getElementById('exercise-duration').value * 60;
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
const app = new WorkoutApp();