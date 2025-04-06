// =============================================
//      scripts/timer-app.js - Código Completo
//      (Guía de Tiempos con Reloj y Checkboxes)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a elementos del DOM ---
    const clockDisplay = document.getElementById('clockDisplay');
    const btnManana = document.getElementById('btnManana');
    const btnTarde = document.getElementById('btnTarde');
    const currentShiftTitle = document.getElementById('currentShiftTitle');
    const taskListDiv = document.getElementById('taskList');
    const timerControlDiv = document.getElementById('timerControl');
    const currentTaskForTimer = document.getElementById('currentTaskForTimer');
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const stopTimerBtn = document.getElementById('stopTimerBtn');
    const timerWarning = document.getElementById('timerWarning');
    const alertArea = document.getElementById('alertArea');

    // --- Variables de Estado ---
    let currentShift = null; // 'morning' o 'afternoon'
    let currentTasks = [];   // Tareas del turno actual
    let timerInterval = null; // Referencia al intervalo del timer activo
    let secondsRemaining = 0; // Segundos restantes en el timer
    let currentTimedTask = null; // La tarea específica cuyo timer está activo/listo
    let highlightInterval = null; // Referencia al intervalo que actualiza la UI
    let clockInterval = null; // Intervalo para el reloj
    let lastUpcomingTaskAlerted = -1; // Índice de la última tarea futura notificada
    let taskCompletionState = {}; // Almacena estado de checkboxes { morning: [bool, bool,...], afternoon: [...] }

    // --- Constantes ---
    const HIGHLIGHT_INTERVAL_MS = 15000; // Cada cuánto revisar hora actual (15 segs)
    const ALERT_BEFORE_MINUTES = 5;      // Minutos antes para mostrar alerta de próxima tarea
    const STORAGE_KEY_PREFIX = 'nfrTimerTaskState_'; // Prefijo para localStorage

    // --- Inicialización de la Aplicación ---
    function init() {
        // Asignar funciones a los botones de turno
        btnManana.addEventListener('click', () => selectShift('morning'));
        btnTarde.addEventListener('click', () => selectShift('afternoon'));
        // Asignar funciones a los botones del timer
        startTimerBtn.addEventListener('click', startTimer);
        stopTimerBtn.addEventListener('click', stopTimer);
        // Iniciar reloj
        startClock();
        console.log("App Guía de Tiempos inicializada.");
    }

    // --- Reloj ---
    function startClock() {
        if (clockInterval) clearInterval(clockInterval);
        updateClock(); // Llamar inmediatamente
        clockInterval = setInterval(updateClock, 1000); // Actualizar cada segundo
    }

    function updateClock() {
        const now = new Date();
        // Formato HH:MM:SS
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        if (clockDisplay) {
             clockDisplay.textContent = `${hours}:${minutes}:${seconds}`;
        }
    }

    // --- Selección de Turno ---
    function selectShift(shiftName) {
        currentShift = shiftName;
        currentTasks = scheduleData[shiftName] || [];

        // Marcar botón activo/inactivo
        if(shiftName === 'morning') {
            btnManana.classList.add('active');
            btnTarde.classList.remove('active');
        } else {
            btnTarde.classList.add('active');
            btnManana.classList.remove('active');
        }

        // Actualizar título
        currentShiftTitle.textContent = `Cronograma Turno ${shiftName === 'morning' ? 'Mañana' : 'Tarde'}`;

        // Cargar estado de checkboxes ANTES de mostrar tareas
        loadTaskCompletionState();
        // Mostrar la lista de tareas con checkboxes
        displayTasks();

        // Resetear/Parar Timers y Alertas
        stopTimer();
        timerControlDiv.style.display = 'none'; // Ocultar control timer
        alertArea.innerHTML = ''; // Limpiar alertas
        lastUpcomingTaskAlerted = -1; // Resetear índice de última alerta

        // Iniciar/Reiniciar el intervalo de actualización de UI (resaltado y alertas)
        if (highlightInterval) clearInterval(highlightInterval);
        highlightInterval = setInterval(updateHighlightAndCheckAlerts, HIGHLIGHT_INTERVAL_MS);
        updateHighlightAndCheckAlerts(); // Llamar inmediatamente para estado inicial

        console.log("Turno seleccionado:", shiftName);
    }

    // --- Mostrar Lista de Tareas (con Checkboxes) ---
    function displayTasks() {
        taskListDiv.innerHTML = ''; // Limpiar lista anterior
        if (currentTasks.length === 0) {
            taskListDiv.innerHTML = '<p>No hay tareas definidas para este turno.</p>';
            return;
        }
        const ul = document.createElement('ul');
        currentTasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.dataset.index = index;

            // Verificar estado completado desde el estado cargado
            const isCompleted = taskCompletionState[currentShift] && taskCompletionState[currentShift][index];
            if (isCompleted) {
                li.classList.add('completed');
            }

            // Crear Checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = isCompleted;
            checkbox.dataset.taskIndex = index; // Guardar índice en el checkbox
            checkbox.classList.add('task-checkbox');
            checkbox.addEventListener('change', handleTaskCheck); // Asignar manejador
            li.appendChild(checkbox);

            // Crear Texto de la tarea (dentro de un span para que el click funcione mejor)
            const textSpan = document.createElement('span');
            textSpan.classList.add('task-text');
            const startTime = task.start ? `<span class="task-time">[${task.start}]</span> ` : '';
            let taskHtml = `${startTime}${task.name} (${task.duration} min)`;
            // Añadir indicación visual si la tarea tiene timer
            if (task.timed) {
                 taskHtml += ' <small style="color:#007bff; font-weight:bold;">(Timer)</small>';
            }
            textSpan.innerHTML = taskHtml;
            li.appendChild(textSpan);

            // Añadir listener al LI para que clickear en el texto también marque/desmarque
             li.addEventListener('click', (e) => {
                 // Solo simular click si NO se clickeó directamente en el checkbox
                 if (e.target !== checkbox) {
                     checkbox.checked = !checkbox.checked;
                     // Disparar manualmente el evento 'change' en el checkbox para activar handleTaskCheck
                     checkbox.dispatchEvent(new Event('change'));
                 }
             });

            ul.appendChild(li);
        });
        taskListDiv.appendChild(ul);
    }

    // --- Lógica de Checkboxes y Persistencia ---
    // Se llama cuando un checkbox cambia
    function handleTaskCheck(event) {
        const checkbox = event.target;
        const taskIndex = parseInt(checkbox.dataset.taskIndex, 10);
        const li = checkbox.closest('li'); // El elemento <li> padre

        if (checkbox.checked) {
            li.classList.add('completed');
        } else {
            li.classList.remove('completed');
        }
        // Actualizar el estado en memoria
        updateTaskCompletionState(taskIndex, checkbox.checked);
        // Guardar todos los estados del turno actual en localStorage
        saveTaskCompletionState();
    }

    // Actualiza el array en memoria para el estado de una tarea
    function updateTaskCompletionState(index, isCompleted) {
        if (!currentShift || !taskCompletionState[currentShift]) return;
        taskCompletionState[currentShift][index] = isCompleted;
    }

    // Guarda el array de estados booleanos del turno actual en localStorage
    function saveTaskCompletionState() {
        if (!currentShift) return;
        try {
            const key = `${STORAGE_KEY_PREFIX}${currentShift}`; // Clave única por turno
            localStorage.setItem(key, JSON.stringify(taskCompletionState[currentShift] || []));
           // console.log("Estado de tareas guardado para", currentShift);
        } catch (e) {
            console.error("Error al guardar estado de tareas en localStorage:", e);
            showAlert("Error al guardar progreso de tareas."); // Informar al usuario
        }
    }

    // Carga el estado de las tareas para el turno actual desde localStorage
    function loadTaskCompletionState() {
        if (!currentShift) return;
        try {
            const key = `${STORAGE_KEY_PREFIX}${currentShift}`;
            const savedState = localStorage.getItem(key);
            if (savedState) {
                const parsedState = JSON.parse(savedState);
                // Asegurarse de que el estado cargado tenga la longitud correcta
                if (parsedState.length === currentTasks.length) {
                    taskCompletionState[currentShift] = parsedState;
                } else {
                     // Si la longitud no coincide (ej. cambio en schedule-data), inicializar
                    console.warn("Longitud de estado guardado no coincide, reiniciando.");
                    taskCompletionState[currentShift] = Array(currentTasks.length).fill(false);
                }
                // console.log("Estado de tareas cargado para", currentShift);
            } else {
                // Si no hay estado guardado, inicializar como array de falsos
                taskCompletionState[currentShift] = Array(currentTasks.length).fill(false);
                // console.log("Inicializando estado de tareas para", currentShift);
            }
        } catch (e) {
            console.error("Error al cargar estado de tareas de localStorage:", e);
            // Inicializar con falsos en caso de error
            taskCompletionState[currentShift] = Array(currentTasks.length).fill(false);
        }
    }


    // --- Función Principal de Actualización Periódica (Resaltado y Alertas) ---
     function updateHighlightAndCheckAlerts() {
        if (!currentShift) return;

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeMinutes = currentHour * 60 + currentMinute;

        let activeTaskLi = null;
        let relevantTimedTask = null;
        let nextTaskToAlert = null;

        // 1. Quitar resaltado anterior
        taskListDiv.querySelectorAll('li').forEach(li => li.classList.remove('current-task'));

        // 2. Iterar tareas para resaltar actual y encontrar próxima para alertar
        for (let i = 0; i < currentTasks.length; i++) {
             const task = currentTasks[i];
             if (task.start && task.duration > 0) { // Considerar tareas con inicio y duración
                const [startHour, startMinute] = task.start.split(':').map(Number);
                const taskStartTimeMinutes = startHour * 60 + startMinute;
                const taskEndTimeMinutes = taskStartTimeMinutes + task.duration;

                // --- Resaltado ---
                if (currentTimeMinutes >= taskStartTimeMinutes && currentTimeMinutes < taskEndTimeMinutes) {
                    const li = taskListDiv.querySelector(`li[data-index="${i}"]`);
                    if (li) {
                        li.classList.add('current-task');
                        activeTaskLi = li;
                    }
                    // Si esta tarea tiene timer y NO hay uno corriendo, es la relevante para el botón
                    if (task.timed && !timerInterval) {
                        relevantTimedTask = task;
                    }
                }

                // --- Lógica Alerta Próxima Tarea ---
                const timeDiffMinutes = taskStartTimeMinutes - currentTimeMinutes;
                if (timeDiffMinutes > 0 && timeDiffMinutes <= ALERT_BEFORE_MINUTES && i > lastUpcomingTaskAlerted) {
                     if (!nextTaskToAlert || taskStartTimeMinutes < (nextTaskToAlert.startHour * 60 + nextTaskToAlert.startMinute)) {
                         nextTaskToAlert = { ...task, index: i, startHour, startMinute };
                     }
                }
            } // end if task.start
        } // end for

        // 3. Disparar Alerta si corresponde
         if (nextTaskToAlert) {
             showAlert(`Próxima Tarea (${nextTaskToAlert.start}): ${nextTaskToAlert.name}`);
             lastUpcomingTaskAlerted = nextTaskToAlert.index; // Marcar como alertada
             console.log("Alerta mostrada para tarea índice:", nextTaskToAlert.index);
         }

        // 4. Configurar el botón y display del Timer
         if (relevantTimedTask && !timerInterval) {
            // Mostrar botón INICIAR
            timerControlDiv.style.display = 'block';
            currentTaskForTimer.textContent = `Timer para: ${relevantTimedTask.name}`;
            timerDisplay.textContent = formatTime(relevantTimedTask.timerDuration);
            startTimerBtn.disabled = false;
            startTimerBtn.dataset.taskIndex = currentTasks.indexOf(relevantTimedTask); // Guardar índice
            stopTimerBtn.style.display = 'none';
             // Advertencia desinfección
             if (relevantTimedTask.name.toLowerCase().includes("desinfección")) {
                timerWarning.style.display = 'block';
                timerWarning.textContent = '¡Atención! Protocolo requiere 30 min.';
            } else {
                 timerWarning.style.display = 'none';
            }
        } else if (!timerInterval) {
            // No hay timer activo y no hay tarea relevante -> Ocultar/Deshabilitar
            timerControlDiv.style.display = 'block'; // O 'none' si prefieres ocultarlo
            currentTaskForTimer.textContent = activeTaskLi ? "Tarea actual sin timer manual" : "Esperando próxima tarea...";
            timerDisplay.textContent = "--:--";
            startTimerBtn.disabled = true;
            stopTimerBtn.style.display = 'none';
            timerWarning.style.display = 'none';
        }
        // Si hay un timer corriendo (timerInterval existe), la UI del timer (display, botón stop) ya está visible y no se toca aquí.
     } // Fin updateHighlightAndCheckAlerts


    // --- Funciones de Manejo del Timer ---
    function startTimer() {
        const taskIndex = startTimerBtn.dataset.taskIndex;
        if (taskIndex === undefined || timerInterval) return;

        currentTimedTask = currentTasks[taskIndex];
        if (!currentTimedTask || !currentTimedTask.timed) return;

        secondsRemaining = currentTimedTask.timerDuration;
        updateTimerDisplay();

        startTimerBtn.disabled = true; // Deshabilitar botón inicio
        stopTimerBtn.style.display = 'inline-block'; // Mostrar botón detener
        timerWarning.style.display = 'none';
        alertArea.innerHTML = ''; // Limpiar alertas al iniciar

        // Iniciar intervalo
        timerInterval = setInterval(() => {
            secondsRemaining--;
            updateTimerDisplay();
            if (secondsRemaining <= 0) {
                handleTimerEnd();
            }
        }, 1000);
        console.log("Timer iniciado para:", currentTimedTask.name);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
            stopTimerBtn.style.display = 'none'; // Ocultar botón detener
            console.log("Timer detenido.");
            updateHighlightAndCheckAlerts(); // Actualizar UI (habilitar/deshabilitar startBtn, etc.)
        }
    }

    function handleTimerEnd() {
        const finishedTaskName = currentTimedTask ? currentTimedTask.name : 'Tarea';
        console.log("Timer finalizado para:", finishedTaskName);
        showAlert(`¡Tiempo completado para: ${finishedTaskName}!`);
        stopTimer(); // Llama a stopTimer que limpia intervalo y actualiza UI
    }

    // Actualiza el display MM:SS
    function updateTimerDisplay() {
        if (timerInterval) { // Mostrar tiempo restante
             timerDisplay.textContent = formatTime(secondsRemaining);
        }
         // Si no hay timer corriendo, updateHighlightAndCheckAlerts decide qué mostrar
    }

    // Formatea segundos a MM:SS
    function formatTime(totalSeconds) {
        if (totalSeconds < 0) totalSeconds = 0;
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // --- Mostrar Mensajes de Alerta ---
    function showAlert(message) {
        alertArea.innerHTML = `<p class="alert-message">${message}</p>`;
        console.log("Mostrando Alerta:", message);

        // Opcional: sonido (requiere interacción del usuario previa en la página para garantizar reproducción)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'triangle'; // Probar otro tono
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime); // Volumen bajo
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.6); // Fade out más largo
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.6);
        } catch (e) {
            console.warn("No se pudo reproducir sonido de alerta:", e);
        }

        // Limpiar alerta después de un tiempo
        setTimeout(() => {
            // Solo limpiar si el mensaje sigue siendo el mismo (evita borrar alertas nuevas)
            if (alertArea.innerHTML.includes(message)) {
                 alertArea.innerHTML = '';
            }
        }, 15000); // Ocultar después de 15 segundos
    }

    // --- Iniciar la aplicación ---
    init();

}); // Fin DOMContentLoaded